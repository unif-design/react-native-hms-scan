package com.huawei.hms.ml.scan

class HmsScan {
  fun getOriginalValue(): String? = "code"

  fun getScanType() = QRCODE_SCAN_TYPE

  fun getScanTypeForm() = PURE_TEXT_FORM

  fun getCornerPoints() = arrayOf(android.graphics.Point(10, 20))

  companion object {
    const val ARTICLE_NUMBER_FORM = 2
    const val AZTEC_SCAN_TYPE = 3
    const val CODABAR_SCAN_TYPE = 4
    const val CODE128_SCAN_TYPE = 5
    const val CODE39_SCAN_TYPE = 6
    const val CODE93_SCAN_TYPE = 7
    const val CONTACT_DETAIL_FORM = 8
    const val DATAMATRIX_SCAN_TYPE = 9
    const val DRIVER_INFO_FORM = 10
    const val EAN13_SCAN_TYPE = 11
    const val EAN8_SCAN_TYPE = 12
    const val EMAIL_CONTENT_FORM = 13
    const val EVENT_INFO_FORM = 14
    const val ISBN_NUMBER_FORM = 15
    const val ITF14_SCAN_TYPE = 16
    const val LOCATION_COORDINATE_FORM = 17
    const val MULTI_FUNCTIONAL_SCAN_TYPE = 18
    const val PDF417_SCAN_TYPE = 19
    const val PURE_TEXT_FORM = 20
    const val QRCODE_SCAN_TYPE = 21
    const val SMS_FORM = 22
    const val TEL_PHONE_NUMBER_FORM = 23
    const val UPCCODE_A_SCAN_TYPE = 24
    const val UPCCODE_E_SCAN_TYPE = 25
    const val URL_FORM = 26
    const val WIFI_CONNECT_INFO_FORM = 27
    const val ALL_SCAN_TYPE = 0
  }
}

class HmsScanAnalyzerOptions {
  class Creator {
    fun setPhotoMode(value: Boolean) = this

    fun setHmsScanTypes(
      first: Int,
      vararg rest: Int,
    ) = this

    fun create() = HmsScanAnalyzerOptions()
  }
}
