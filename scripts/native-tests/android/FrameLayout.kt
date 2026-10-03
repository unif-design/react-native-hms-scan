package android.widget

open class FrameLayout(
  val context: android.content.Context,
) {
  val id = 42

  open fun onAttachedToWindow() {}

  open fun onDetachedFromWindow() {}

  fun addView(
    view: Any,
    params: LayoutParams,
  ) {}

  fun removeView(view: Any) {}

  class LayoutParams(
    val w: Int,
    val h: Int,
  ) {
    companion object {
      const val MATCH_PARENT = -1
    }
  }
}
