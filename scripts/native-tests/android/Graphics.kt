package android.graphics

class Point(
  val x: Int,
  val y: Int,
)

class Matrix {
  var swapped = false

  fun setScale(
    x: Float,
    y: Float,
  ) {}

  fun postScale(
    x: Float,
    y: Float,
  ) {}

  fun setRotate(degrees: Float) {
    swapped = degrees == 90f || degrees == 270f || degrees == -90f
  }

  fun postRotate(degrees: Float) {
    setRotate(degrees)
  }
}

class Bitmap(
  val width: Int = 1,
  val height: Int = 1,
) {
  var isRecycled = false
  var recycleCount = 0
  val allocationByteCount get() = width * height * 4

  fun recycle() {
    recycleCount++
    check(recycleCount == 1) { "bitmap recycled twice" }
    isRecycled = true
  }

  enum class Config { ARGB_8888 }

  companion object {
    val created = mutableListOf<Bitmap>()
    var transformFailure = false
    var sameInstance = false

    fun createBitmap(
      source: Bitmap,
      x: Int,
      y: Int,
      w: Int,
      h: Int,
      matrix: Matrix,
      filter: Boolean,
    ): Bitmap {
      if (transformFailure) throw IllegalStateException("transform failed")
      if (sameInstance) return source
      val result = if (matrix.swapped) Bitmap(h, w) else Bitmap(w, h)
      created.add(result)
      return result
    }
  }
}

object BitmapFactory {
  var width = 9000
  var height = 6000
  var largestPixels = 0L
  var pixelReads = 0
  var fail = false

  class Options {
    var inJustDecodeBounds = false
    var outWidth = 0
    var outHeight = 0
    var inSampleSize = 1
    var inPreferredConfig = Bitmap.Config.ARGB_8888
  }

  fun decodeFile(
    path: String,
    options: Options? = null,
  ): Bitmap? {
    if (options?.inJustDecodeBounds == true) {
      options.outWidth = width
      options.outHeight = height
      return null
    }
    pixelReads++
    if (fail) return null
    val s = options?.inSampleSize ?: 1
    val b = Bitmap((width + s - 1) / s, (height + s - 1) / s)
    largestPixels = maxOf(largestPixels, b.width.toLong() * b.height)
    Bitmap.created.add(b)
    return b
  }
}
