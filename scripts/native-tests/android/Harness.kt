import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.ExifInterface
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.PermissionAwareActivity
import com.facebook.react.modules.core.PermissionListener
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.huawei.hms.hmsscankit.RemoteView
import com.huawei.hms.hmsscankit.ScanUtil
import com.unif.reactnativehmsscan.HmsScanModule
import com.unif.reactnativehmsscan.HmsScanView
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class RecordingPromise : Promise {
  val values = mutableListOf<Any?>()
  val done = CountDownLatch(1)

  override fun resolve(value: Any?) {
    values.add(value)
    done.countDown()
  }

  override fun reject(
    code: String,
    message: String?,
  ) {
    values.add("reject:" + code)
    done.countDown()
  }

  override fun reject(
    code: String,
    message: String?,
    e: Throwable,
  ) {
    reject(code, message)
  }

  fun await(): Any? {
    check(done.await(5, TimeUnit.SECONDS)) { "Promise did not settle" }
    return values.single()
  }
}

// RN 0.86 ReactActivityDelegate stores one permission listener, not one per request code.
class Activity :
  android.app.Activity(),
  PermissionAwareActivity {
  var listener: PermissionListener? = null
  var requests = 0
  var requestFailure: Exception? = null

  override fun requestPermissions(
    permissions: Array<String>,
    code: Int,
    listener: PermissionListener,
  ) {
    requestFailure?.let { throw it }
    this.listener = listener
    requests++
  }

  fun reply() {
    if (listener?.onRequestPermissionsResult(0x484D, arrayOf("camera"), intArrayOf(0)) == true) listener = null
  }
}

fun main() {
  var failures = 0

  fun test(
    name: String,
    body: () -> Unit,
  ) {
    try {
      body()
      println("PASS: " + name)
    } catch (error: Throwable) {
      failures++
      println("FAIL: " + name + ": " + error.message)
    }
  }
  test("detached views release lifecycle listeners and can reattach") {
    val app = ReactApplicationContext()
    app.currentActivity = Activity()
    val ctx = ThemedReactContext(app)
    repeat(100) {
      val view = HmsScanView(ctx)
      view.onAttachedToWindow()
      view.onDetachedFromWindow()
    }
    check(app.listeners.isEmpty()) { "retained " + app.listeners.size + " detached views" }
    val view = HmsScanView(ctx)
    view.onAttachedToWindow()
    view.onDetachedFromWindow()
    view.onAttachedToWindow()
    check(app.listeners.size == 1)
    view.onDetachedFromWindow()
    check(app.listeners.isEmpty())
  }
  test("unchanged torch reports cross the bridge once") {
    val app = ReactApplicationContext()
    app.currentActivity = Activity()
    UIManagerHelper.events.clear()
    val view = HmsScanView(ThemedReactContext(app))
    view.onAttachedToWindow()
    view.setTorch(false)
    view.setTorch(false)
    view.onHostResume()
    check(UIManagerHelper.events.count { it.getEventName() == "topTorchState" } == 1)
    view.onDetachedFromWindow()
  }
  for (throwsError in listOf(false, true)) {
    val failure = if (throwsError) "exception" else "rejection"
    test("failed torch enable ($failure) reports off again so the next press can retry") {
      val app = ReactApplicationContext()
      app.currentActivity = Activity()
      UIManagerHelper.events.clear()
      RemoteView.switchLightCalls = 0
      val view = HmsScanView(ThemedReactContext(app))

      fun torchReports() = UIManagerHelper.events.filter { it.getEventName() == "topTorchState" }

      try {
        view.onAttachedToWindow()
        check(torchReports().size == 1 && torchReports().last().getEventData().entries["on"] == false)
        RemoteView.throwsOnSwitchLight = throwsError
        RemoteView.rejectsSwitchLight = !throwsError
        view.setTorch(true)
        check(torchReports().size == 2 && torchReports().last().getEventData().entries["on"] == false) {
          "failed enable did not acknowledge the unchanged off state"
        }
        // Scanner reconciles its request to the failed command's actual-state report.
        view.setTorch(false)
        check(torchReports().size == 2) { "unchanged successful off request was reported again" }
        RemoteView.throwsOnSwitchLight = false
        RemoteView.rejectsSwitchLight = false
        view.setTorch(true)
        check(RemoteView.switchLightCalls == 2) { "next press did not retry the hardware command" }
        check(torchReports().size == 3 && torchReports().last().getEventData().entries["on"] == true)
      } finally {
        RemoteView.throwsOnSwitchLight = false
        RemoteView.rejectsSwitchLight = false
        view.onDetachedFromWindow()
      }
    }
  }
  test("concurrent camera requests share one prompt and both settle") {
    val app = ReactApplicationContext()
    val activity = Activity()
    app.currentActivity = activity
    val module = HmsScanModule(app)
    val first = RecordingPromise()
    val second = RecordingPromise()
    module.requestCameraPermission(first)
    module.requestCameraPermission(second)
    activity.reply()
    activity.reply()
    check(activity.requests == 1) { "started " + activity.requests + " prompts" }
    check(first.await() == "granted")
    check(second.await() == "granted")
    module.invalidate()
  }
  test("host destruction rejects pending permission borrowers") {
    val app = ReactApplicationContext()
    app.currentActivity = Activity()
    val module = HmsScanModule(app)
    val result = RecordingPromise()
    module.requestCameraPermission(result)
    app.listeners.toList().forEach { it.onHostDestroy() }
    check(result.await() == "reject:E_NO_ACTIVITY")
    check(app.listeners.isEmpty())
    module.invalidate()
  }
  val image = java.io.File.createTempFile("scan-native-", ".jpg")

  fun decode(
    width: Int,
    height: Int,
    orientation: Int = 1,
  ): Any? {
    BitmapFactory.width = width
    BitmapFactory.height = height
    BitmapFactory.largestPixels = 0
    BitmapFactory.pixelReads = 0
    BitmapFactory.fail = false
    Bitmap.created.clear()
    ExifInterface.orientation = orientation
    ScanUtil.fail = false
    val module = HmsScanModule(ReactApplicationContext())
    val result = RecordingPromise()
    module.decodeImage("file://" + image.absolutePath, "", result)
    val value = result.await()
    module.invalidate()
    return value
  }
  test("large image is sampled before allocation and returns original image coordinates") {
    val value = decode(9000, 6000)
    check(BitmapFactory.largestPixels <= 8388608L) { "allocated " + BitmapFactory.largestPixels + " pixels" }
    check(value.toString().contains("\"value\":\"code\""))
    check(value.toString().contains("\"x\":40.0"))
    check(value.toString().contains("\"y\":80.0"))
    check(Bitmap.created.all { it.isRecycled })
  }
  test("EXIF rotation uses upright pixels and keeps coordinate scale") {
    val value = decode(9000, 6000, 6)
    check(ScanUtil.input?.width == 1500 && ScanUtil.input?.height == 2250) { "vendor received unrotated bitmap" }
    check(value.toString().contains("\"x\":40.0"))
    check(value.toString().contains("\"y\":80.0"))
    check(Bitmap.created.all { it.isRecycled })
  }
  test("270 degree EXIF and non-divisible sampling map to upright source coordinates") {
    val value = decode(9001, 6001, 8).toString()
    check(ScanUtil.input?.width == 1501 && ScanUtil.input?.height == 2251)
    val x = Regex("\"x\":([0-9.]+)").find(value)!!.groupValues[1].toDouble()
    val y = Regex("\"y\":([0-9.]+)").find(value)!!.groupValues[1].toDouble()
    // Hand-calculated in upright original pixels: 10 * 6001 / 1501, 20 * 9001 / 2251.
    check(kotlin.math.abs(x - 39.98001332445) < 0.000000001)
    check(kotlin.math.abs(y - 79.97334517992) < 0.000000001)
    check(Bitmap.created.all { it.isRecycled })
  }
  test("unreasonable dimensions fail before full pixel allocation") {
    val value = decode(1000000, 1000000)
    check(value == "reject:E_INVALID_INPUT") { "oversized input returned " + value }
    check(BitmapFactory.pixelReads == 0) { "started full image read" }
  }
  test("image decoding leaves the caller thread") {
    decode(640, 480)
    check(ScanUtil.thread != null && ScanUtil.thread != Thread.currentThread().name) { "decode stayed on caller thread" }
  }
  test("bounded queue rejects overflow and invalidation preserves the active read") {
    BitmapFactory.width = 640
    BitmapFactory.height = 480
    Bitmap.created.clear()
    ExifInterface.orientation = 1
    val entered = CountDownLatch(1)
    val release = CountDownLatch(1)
    ScanUtil.entered = entered
    ScanUtil.release = release
    val module = HmsScanModule(ReactApplicationContext())
    val active = RecordingPromise()
    try {
      module.decodeImage("file://" + image.absolutePath, "", active)
      check(entered.await(2, TimeUnit.SECONDS))
      val waiting = List(4) { RecordingPromise().also { module.decodeImage("file://" + image.absolutePath, "", it) } }
      val overflow = RecordingPromise()
      module.decodeImage("file://" + image.absolutePath, "", overflow)
      check(overflow.await() == "reject:E_UNAVAILABLE")
      module.invalidate()
      waiting.forEach { check(it.await() == "reject:E_UNAVAILABLE") }
      check(active.done.count == 1L)
      check(Bitmap.created.none { it.isRecycled })
      release.countDown()
      check(active.await().toString().contains("code"))
      check(Bitmap.created.all { it.isRecycled })
    } finally {
      release.countDown()
      module.invalidate()
      ScanUtil.entered = null
      ScanUtil.release = null
    }
  }
  test("vendor failure recycles the borrowed bitmap before rejection") {
    BitmapFactory.width = 640
    BitmapFactory.height = 480
    Bitmap.created.clear()
    ExifInterface.orientation = 1
    ScanUtil.fail = true
    val module = HmsScanModule(ReactApplicationContext())
    val result = RecordingPromise()
    module.decodeImage("file://" + image.absolutePath, "", result)
    check(result.await() == "reject:E_DECODE_FAILED")
    check(Bitmap.created.all { it.isRecycled })
    module.invalidate()
    ScanUtil.fail = false
  }
  test("failed EXIF allocation recycles the source once") {
    BitmapFactory.width = 640
    BitmapFactory.height = 480
    Bitmap.created.clear()
    ExifInterface.orientation = 6
    Bitmap.transformFailure = true
    val module = HmsScanModule(ReactApplicationContext())
    val result = RecordingPromise()
    module.decodeImage("file://" + image.absolutePath, "", result)
    check(result.await() == "reject:E_DECODE_FAILED")
    check(Bitmap.created.single().recycleCount == 1)
    module.invalidate()
    Bitmap.transformFailure = false
  }
  test("a platform transform returning its input is released once") {
    BitmapFactory.width = 640
    BitmapFactory.height = 480
    Bitmap.created.clear()
    ExifInterface.orientation = 2
    Bitmap.sameInstance = true
    val module = HmsScanModule(ReactApplicationContext())
    val result = RecordingPromise()
    module.decodeImage("file://" + image.absolutePath, "", result)
    check(result.await().toString().contains("code"))
    check(Bitmap.created.single().recycleCount == 1)
    module.invalidate()
    Bitmap.sameInstance = false
  }
  test("module invalidation settles permission waiters and ignores their late callback") {
    val app = ReactApplicationContext()
    val activity = Activity()
    app.currentActivity = activity
    val module = HmsScanModule(app)
    val result = RecordingPromise()
    module.requestCameraPermission(result)
    module.invalidate()
    check(result.await() == "reject:E_UNAVAILABLE")
    activity.reply()
    check(result.values.size == 1)
    check(app.listeners.isEmpty())
  }
  test("package and manager register the real module, view and event contracts") {
    val app = ReactApplicationContext()
    val pkg = com.unif.reactnativehmsscan.ReactNativeHmsScanPackage()
    val module = pkg.getModule("HmsScan", app) as HmsScanModule
    check(module.getName() == "HmsScan")
    check(pkg.getModule("Other", app) == null)
    val info = pkg.getReactModuleInfoProvider().getReactModuleInfos().getValue("HmsScan")
    check(info.isTurboModule && !info.needsEagerInit && !info.isCxxModule)
    val manager = pkg.createViewManagers(app).single() as com.unif.reactnativehmsscan.HmsScanViewManager
    check(manager.getName() == "HmsScanView")
    check(manager.getDelegate() === manager.getDelegate())
    val expected = mapOf("topScanResult" to mapOf("registrationName" to "onScanResult"), "topScanError" to mapOf("registrationName" to "onScanError"), "topTorchState" to mapOf("registrationName" to "onTorchState"))
    check(manager.getExportedCustomDirectEventTypeConstants() == expected)
    val view = manager.createViewInstance(ThemedReactContext(app))
    for (target in listOf(view, null)) {
      manager.setFormatsCsv(target, "QR_CODE")
      manager.setContinuous(target, false)
      manager.setPaused(target, true)
      manager.setTorch(target, false)
    }
    view.onDetachedFromWindow()
    module.invalidate()
  }
  test("mapper preserves all supported formats and content types") {
    val mapper = com.unif.reactnativehmsscan.HmsScanResultMapper
    val scan = com.huawei.hms.ml.scan.HmsScan
    val formats = listOf(
      scan.QRCODE_SCAN_TYPE to "QR_CODE", scan.AZTEC_SCAN_TYPE to "AZTEC", scan.DATAMATRIX_SCAN_TYPE to "DATA_MATRIX",
      scan.PDF417_SCAN_TYPE to "PDF417", scan.CODABAR_SCAN_TYPE to "CODABAR", scan.CODE39_SCAN_TYPE to "CODE_39",
      scan.CODE93_SCAN_TYPE to "CODE_93", scan.CODE128_SCAN_TYPE to "CODE_128", scan.EAN8_SCAN_TYPE to "EAN_8",
      scan.EAN13_SCAN_TYPE to "EAN_13", scan.UPCCODE_A_SCAN_TYPE to "UPC_A", scan.UPCCODE_E_SCAN_TYPE to "UPC_E",
      scan.ITF14_SCAN_TYPE to "ITF14", scan.MULTI_FUNCTIONAL_SCAN_TYPE to "MULTI_FUNCTIONAL")
    for ((number, name) in formats) {
      check(mapper.mapScanType(number) == name)
      check(mapper.parseFormatsCsv(name)?.toList() == listOf(number))
    }
    check(mapper.mapScanType(-999) == "UNKNOWN")
    check(mapper.parseFormatsCsv(null) == null)
    check(mapper.parseFormatsCsv(" ") == null)
    check(mapper.parseFormatsCsv("UNKNOWN,,") == null)
    check(mapper.parseFormatsCsv(" QR_CODE,QR_CODE,EAN_13,")?.toList() == listOf(scan.QRCODE_SCAN_TYPE, scan.EAN13_SCAN_TYPE))
    val contents = listOf(scan.URL_FORM to "URL", scan.EMAIL_CONTENT_FORM to "EMAIL", scan.TEL_PHONE_NUMBER_FORM to "PHONE", scan.SMS_FORM to "SMS", scan.WIFI_CONNECT_INFO_FORM to "WIFI", scan.CONTACT_DETAIL_FORM to "CONTACT", scan.EVENT_INFO_FORM to "EVENT", scan.LOCATION_COORDINATE_FORM to "LOCATION", scan.DRIVER_INFO_FORM to "DRIVER", scan.ISBN_NUMBER_FORM to "ISBN", scan.ARTICLE_NUMBER_FORM to "ARTICLE", scan.PURE_TEXT_FORM to "TEXT", -1 to "OTHER")
    for ((form, name) in contents) check(mapper.toJson(arrayOf(com.huawei.hms.ml.scan.HmsScan(form = form))).contains("\"contentType\":\"$name\""))
    check(mapper.toJson(null) == "[]")
    check(mapper.toJson(arrayOf(null)) == "[]")
    for (points in listOf(null, emptyArray(), arrayOf<android.graphics.Point?>(null))) {
      check(!mapper.toJson(arrayOf(com.huawei.hms.ml.scan.HmsScan(points = points))).contains("cornerPoints"))
    }
  }
  test("permission results reject incomplete prompts and distinguish denied from blocked") {
    val app = ReactApplicationContext()
    val activity = Activity()
    app.currentActivity = activity
    val module = HmsScanModule(app)
    try {
      for (granted in listOf(false, true)) {
        app.permissionGranted = granted
        val result = RecordingPromise()
        module.getCameraPermissionStatus(result)
        check(result.await() == if (granted) "granted" else "denied")
      }
      val granted = RecordingPromise()
      module.requestCameraPermission(granted)
      check(granted.await() == "granted" && activity.requests == 0)
      app.permissionGranted = false
      for (rationale in listOf(false, true)) {
        androidx.core.app.ActivityCompat.showRationale = rationale
        val result = RecordingPromise()
        module.requestCameraPermission(result)
        check(activity.listener?.onRequestPermissionsResult(1, arrayOf(), intArrayOf()) == false)
        check(activity.listener?.onRequestPermissionsResult(0x484D, arrayOf("camera"), intArrayOf(-1)) == true)
        check(result.await() == if (rationale) "denied" else "blocked")
      }
      val empty = RecordingPromise()
      module.requestCameraPermission(empty)
      activity.listener?.onRequestPermissionsResult(0x484D, arrayOf("camera"), intArrayOf())
      check(empty.await() == "reject:E_UNAVAILABLE")
      for (failure in listOf(IllegalStateException("request failed"), IllegalStateException())) {
        activity.requestFailure = failure
        val result = RecordingPromise()
        module.requestCameraPermission(result)
        check(result.await() == "reject:E_UNAVAILABLE")
      }
      activity.requestFailure = null
      androidx.core.content.ContextCompat.failure = IllegalStateException("permission service failed")
      val read = RecordingPromise()
      module.getCameraPermissionStatus(read)
      check(read.await() == "reject:E_UNAVAILABLE")
      val request = RecordingPromise()
      module.requestCameraPermission(request)
      check(request.await() == "reject:E_UNAVAILABLE")
    } finally {
      androidx.core.content.ContextCompat.failure = null
      androidx.core.app.ActivityCompat.showRationale = true
      module.invalidate()
    }
    val after = RecordingPromise()
    module.requestCameraPermission(after)
    check(after.await() == "reject:E_UNAVAILABLE")
  }
  test("permission ownership changes reject old borrowers and ignore their late response") {
    val app = ReactApplicationContext()
    val module = HmsScanModule(app)
    for (activity in listOf(null, android.app.Activity())) {
      app.currentActivity = activity
      val result = RecordingPromise()
      module.requestCameraPermission(result)
      check(result.await() == "reject:E_NO_ACTIVITY")
    }
    val oldActivity = Activity()
    app.currentActivity = oldActivity
    val old = RecordingPromise()
    module.requestCameraPermission(old)
    val nextActivity = Activity()
    app.currentActivity = nextActivity
    val next = RecordingPromise()
    module.requestCameraPermission(next)
    check(old.await() == "reject:E_NO_ACTIVITY")
    oldActivity.reply()
    nextActivity.reply()
    check(old.values.size == 1 && next.await() == "granted")
    module.onHostPause()
    module.onHostResume()
    module.onHostDestroy()
    module.invalidate()
    val decodeAfter = RecordingPromise()
    module.decodeImage("file://" + image.absolutePath, "", decodeAfter)
    check(decodeAfter.await() == "reject:E_UNAVAILABLE")
  }
  test("view rebuilds drop stale callbacks and preserve real result events") {
    val app = ReactApplicationContext()
    app.currentActivity = Activity()
    UIManagerHelper.events.clear()
    val view = HmsScanView(ThemedReactContext(app))
    view.setFormatsCsv("QR_CODE,EAN_13")
    view.setContinuous(false)
    view.onHostResume()
    view.onHostPause()
    view.onAttachedToWindow()
    view.onAttachedToWindow()
    var vendor = RemoteView.instances.last()
    view.setFormatsCsv("QR_CODE,EAN_13")
    view.setContinuous(false)
    check(RemoteView.instances.last() === vendor)
    val original = vendor
    view.setFormatsCsv("QR_CODE")
    vendor = RemoteView.instances.last()
    original.result?.result(arrayOf(com.huawei.hms.ml.scan.HmsScan()))
    original.lightCallback?.visible(true)
    check(UIManagerHelper.events.none { it.getEventName() == "topScanResult" })
    for (results in listOf(null, emptyArray(), arrayOf<com.huawei.hms.ml.scan.HmsScan?>(null))) vendor.result?.result(results)
    view.setPaused(true)
    vendor.result?.result(arrayOf(com.huawei.hms.ml.scan.HmsScan()))
    check(UIManagerHelper.events.none { it.getEventName() == "topScanResult" })
    view.setPaused(false)
    vendor.result?.result(arrayOf(com.huawei.hms.ml.scan.HmsScan(value = null)))
    check(UIManagerHelper.events.last().getEventData().entries["code"] == "E_INVALID_RESPONSE")
    vendor.result?.result(arrayOf(com.huawei.hms.ml.scan.HmsScan()))
    check(UIManagerHelper.events.last().getEventName() == "topScanResult")
    vendor.lightCallback?.visible(true)
    check(UIManagerHelper.events.last().getEventData().entries["hasLowLight"] == true)
    check(UIManagerHelper.events.last().getEventData().entries["lowLight"] == true)
    RemoteView.failureOnReadLight = IllegalStateException("camera disconnected")
    view.setTorch(true)
    RemoteView.failureOnReadLight = null
    RemoteView.failureOnPause = IllegalStateException("paused unavailable")
    view.setPaused(true)
    RemoteView.failureOnPause = null
    view.onHostPause()
    RemoteView.failureOnDestroy = IllegalStateException("already destroyed")
    view.onHostDestroy()
    RemoteView.failureOnDestroy = null
    view.onDetachedFromWindow()
    vendor.result?.result(arrayOf(com.huawei.hms.ml.scan.HmsScan()))
    vendor.lightCallback?.visible(false)
    check(app.listeners.isEmpty())
  }
  test("view reports missing host and vendor construction failures") {
    val app = ReactApplicationContext()
    val view = HmsScanView(ThemedReactContext(app))
    UIManagerHelper.events.clear()
    view.onAttachedToWindow()
    check(UIManagerHelper.events.last().getEventData().entries["code"] == "E_CAMERA_INIT")
    app.currentActivity = Activity()
    for (failure in listOf(IllegalStateException("construction failed"), IllegalStateException())) {
      RemoteView.failureOnBuild = failure
      view.setFormatsCsv(null)
      check(UIManagerHelper.events.last().getEventData().entries["code"] == "E_CAMERA_INIT")
    }
    RemoteView.failureOnBuild = null
    UIManagerHelper.available = false
    view.setContinuous(true)
    view.onDetachedFromWindow()
    UIManagerHelper.available = true
  }
  test("all EXIF transformations and missing EXIF preserve readable image ownership") {
    for (orientation in 0..9) {
      check(decode(640, 480, orientation).toString().contains("code"))
      check(Bitmap.created.all { it.isRecycled })
    }
    ExifInterface.fail = true
    try { check(decode(640, 480).toString().contains("code")) }
    finally { ExifInterface.fail = false }
  }
  test("decode rejects invalid files, malformed results and vendor memory errors") {
    val module = HmsScanModule(ReactApplicationContext())
    try {
      for (uri in listOf("https://example.com/a", "file://", "file:opaque", "file:///missing-scan-image")) {
        val result = RecordingPromise()
        module.decodeImage(uri, "", result)
        check(result.await().toString().startsWith("reject:E_"))
      }
      BitmapFactory.width = 640
      BitmapFactory.height = 480
      ExifInterface.orientation = 1
      val uri = "file://" + image.absolutePath
      for (failure in listOf(IllegalStateException(), OutOfMemoryError())) {
        ScanUtil.failure = failure
        val result = RecordingPromise()
        module.decodeImage(uri, "QR_CODE,EAN_13", result)
        check(result.await() == "reject:E_DECODE_FAILED")
      }
      ScanUtil.failure = null
      ScanUtil.response = arrayOf(com.huawei.hms.ml.scan.HmsScan(value = null))
      val invalid = RecordingPromise()
      module.decodeImage(uri, "QR_CODE", invalid)
      check(invalid.await() == "reject:E_INVALID_RESPONSE")
      ScanUtil.response = null
      for ((w, h) in listOf(0 to 1, 1 to 0, 1 to 40000, 20000 to 20000)) {
        BitmapFactory.width = w
        BitmapFactory.height = h
        val result = RecordingPromise()
        module.decodeImage(uri, "", result)
        check(result.await().toString().startsWith("reject:E_"))
      }
      BitmapFactory.width = 640
      BitmapFactory.height = 480
      BitmapFactory.fail = true
      val invalidBitmap = RecordingPromise()
      module.decodeImage(uri, "", invalidBitmap)
      check(invalidBitmap.await() == "reject:E_IMAGE_LOAD_FAILED")
      BitmapFactory.fail = false
    } finally {
      ScanUtil.failure = null
      ScanUtil.response = null
      BitmapFactory.fail = false
      module.invalidate()
    }
  }
  test("work captured before invalidation rejects when it starts afterwards") {
    val module = HmsScanModule(ReactApplicationContext())
    val workClass = module.javaClass.declaredClasses.single { it.simpleName == "ImageWork" }
    val constructor = workClass.declaredConstructors.single().apply { isAccessible = true }
    val promise = RecordingPromise()
    val uri = "file://" + image.absolutePath
    val work = constructor.newInstance(module, uri, "QR_CODE", promise)
    for ((name, expected) in listOf("getUri" to uri, "getFormatsCsv" to "QR_CODE", "getPromise" to promise)) {
      check(workClass.getDeclaredMethod(name).apply { isAccessible = true }.invoke(work) == expected)
    }
    module.invalidate()
    (work as Runnable).run()
    check(promise.await() == "reject:E_UNAVAILABLE")
  }
  test("settling an old permission batch again is harmless") {
    val app = ReactApplicationContext().apply { currentActivity = Activity() }
    val module = HmsScanModule(app)
    val promise = RecordingPromise()
    module.requestCameraPermission(promise)
    val batch = module.javaClass.getDeclaredField("permissionBatch").apply { isAccessible = true }.get(module)
    module.invalidate()
    check(promise.await() == "reject:E_UNAVAILABLE")
    val finish = module.javaClass.getDeclaredMethod("finishPermissions", batch.javaClass).apply { isAccessible = true }
    check((finish.invoke(module, batch) as List<*>).isEmpty())
    check(promise.values.size == 1)
  }
  test("file size, read permissions and decoder allocation budget are enforced") {
    BitmapFactory.width = 640
    BitmapFactory.height = 480
    BitmapFactory.fail = false
    ExifInterface.orientation = 1
    val uri = "file://" + image.absolutePath
    fun invalid(expected: String) {
      try { com.unif.reactnativehmsscan.HmsScanImage.read(uri); error("invalid image accepted") }
      catch (failure: com.unif.reactnativehmsscan.ScanImageFailure) { check(failure.code == expected) }
    }
    image.setReadable(false, false)
    try { invalid("E_IMAGE_LOAD_FAILED") } finally { image.setReadable(true, true) }
    java.io.RandomAccessFile(image, "rw").use { it.setLength(128L * 1024 * 1024 + 1) }
    try { invalid("E_INVALID_INPUT") } finally { java.io.RandomAccessFile(image, "rw").use { it.setLength(0) } }
    BitmapFactory.decodedSize = 10000 to 10000
    try { invalid("E_INVALID_INPUT") } finally { BitmapFactory.decodedSize = null }
    Bitmap.allocationBytes = 128 * 1024 * 1024
    try { invalid("E_INVALID_INPUT") } finally { Bitmap.allocationBytes = null }
    val owned = com.unif.reactnativehmsscan.HmsScanImage.read(uri)
    owned.close()
    owned.close()
    check(owned.bitmap.recycleCount == 1)
  }
  test("host resume without a constructed preview and late light delivery remain safe") {
    val app = ReactApplicationContext()
    val view = HmsScanView(ThemedReactContext(app))
    view.onAttachedToWindow()
    view.onHostResume()
    view.onDetachedFromWindow()
    val callback = view.javaClass.getDeclaredMethod("onTorchVisible", Boolean::class.javaPrimitiveType).apply { isAccessible = true }
    callback.invoke(view, true)
    check(app.listeners.isEmpty())
  }
  image.delete()
  check(failures == 0) { "$failures native behavior failures" }
}
