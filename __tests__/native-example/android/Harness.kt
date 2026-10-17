import com.facebook.react.PackageList
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactActivityDelegate
import hmsscan.boundary.Boundary
import unif.reactnativehmsscan.example.MainActivity
import unif.reactnativehmsscan.example.MainApplication

fun main() {
  val activity = MainActivity()
  check(activity.mainComponentName == "ReactNativeHmsScanExample") { "JS module name is retained" }
  for (fabric in listOf(false, true)) {
    DefaultNewArchitectureEntryPoint.fabricEnabled = fabric
    val delegate = activity.createReactActivityDelegate() as DefaultReactActivityDelegate
    check(delegate.activity === activity && delegate.component == activity.mainComponentName && delegate.fabric == fabric) {
      "activity delegate receives activity, module name and the actual fabric flag"
    }
  }
  val application = MainApplication()
  check(Boundary.events.isEmpty()) { "host is lazy before first access" }
  val host = application.reactHost
  check(host.context === application && host.packages == listOf(PackageList.autolinked)) {
    "host retains application context and actual autolinked package list"
  }
  check(application.reactHost === host) { "host is cached after first access" }
  check(Boundary.events.map { it.first } == listOf("packages.autolink", "react.host")) { "host construction occurs once" }
  Boundary.events.clear()
  application.onCreate()
  check(Boundary.events.map { it.first } == listOf("application.create", "react.load")) { "super lifecycle precedes RN initialization" }
  check(Boundary.events.all { it.second === application }) { "initialization retains application identity" }
  println("HmsScan Android host assertions passed")
}
