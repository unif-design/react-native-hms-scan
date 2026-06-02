package com.unif.reactnativehmsscan

import com.huawei.hms.ml.scan.HmsScan
import org.json.JSONArray
import org.json.JSONObject

/**
 * Maps HUAWEI Scan Kit [HmsScan] results to the JSON contract shared with the JS
 * side (see src/format.ts / src/types.ts). Both decodeImage() and the onScanResult
 * event return a JSON-encoded array of these objects.
 *
 * Shape:
 * ```json
 * [{"value":"...","format":"EAN_13","contentType":"ARTICLE",
 *   "cornerPoints":[{"x":10,"y":20}]}]
 * ```
 */
internal object HmsScanResultMapper {
  /**
   * Serialize an array of [HmsScan] into the ScanResult[] JSON string. The element
   * type is nullable because the HMS APIs (decodeWithBitmap / OnResultCallback)
   * hand back a Java array that can contain nulls.
   */
  fun toJson(scans: Array<out HmsScan?>?): String {
    val array = JSONArray()
    if (scans != null) {
      for (scan in scans) {
        if (scan == null) continue
        val value = scan.getOriginalValue()
        // A hit with no value is meaningless to the JS layer (it would be dropped
        // by coerceResult anyway); skip it to keep the payload clean.
        if (value.isNullOrEmpty()) continue
        array.put(toJsonObject(scan, value))
      }
    }
    return array.toString()
  }

  private fun toJsonObject(
    scan: HmsScan,
    value: String,
  ): JSONObject {
    val obj = JSONObject()
    obj.put("value", value)
    obj.put("format", mapScanType(scan.getScanType()))

    obj.put("contentType", mapContentType(scan.getScanTypeForm()))

    val cornerPoints = scan.getCornerPoints()
    if (cornerPoints != null && cornerPoints.isNotEmpty()) {
      val points = JSONArray()
      for (point in cornerPoints) {
        if (point == null) continue
        points.put(
          JSONObject().apply {
            put("x", point.x)
            put("y", point.y)
          },
        )
      }
      if (points.length() > 0) {
        obj.put("cornerPoints", points)
      }
    }

    return obj
  }

  /** HmsScan.getScanType() (barcode symbology) -> unified BarcodeFormat string. */
  fun mapScanType(scanType: Int): String =
    when (scanType) {
      HmsScan.QRCODE_SCAN_TYPE -> "QR_CODE"
      HmsScan.AZTEC_SCAN_TYPE -> "AZTEC"
      HmsScan.DATAMATRIX_SCAN_TYPE -> "DATA_MATRIX"
      HmsScan.PDF417_SCAN_TYPE -> "PDF417"
      HmsScan.CODABAR_SCAN_TYPE -> "CODABAR"
      HmsScan.CODE39_SCAN_TYPE -> "CODE_39"
      HmsScan.CODE93_SCAN_TYPE -> "CODE_93"
      HmsScan.CODE128_SCAN_TYPE -> "CODE_128"
      HmsScan.EAN8_SCAN_TYPE -> "EAN_8"
      HmsScan.EAN13_SCAN_TYPE -> "EAN_13"
      HmsScan.UPCCODE_A_SCAN_TYPE -> "UPC_A"
      HmsScan.UPCCODE_E_SCAN_TYPE -> "UPC_E"
      HmsScan.ITF14_SCAN_TYPE -> "ITF14"
      HmsScan.MULTI_FUNCTIONAL_SCAN_TYPE -> "MULTI_FUNCTIONAL"
      else -> "UNKNOWN"
    }

  /**
   * Resolve a comma-separated formats CSV into the int varargs for
   * RemoteView.Builder.setFormat / HmsScanAnalyzerOptions.setHmsScanTypes.
   *
   * Returns null when the CSV is empty / yields no known formats, signalling the
   * caller to fall back to [HmsScan.ALL_SCAN_TYPE].
   */
  fun parseFormatsCsv(formatsCsv: String?): IntArray? {
    if (formatsCsv.isNullOrBlank()) return null
    val types =
      formatsCsv
        .split(",")
        .map { it.trim() }
        .filter { it.isNotEmpty() }
        .mapNotNull { mapFormatString(it) }
        .distinct()
    return if (types.isEmpty()) null else types.toIntArray()
  }

  /** Unified BarcodeFormat string -> HmsScan.*_SCAN_TYPE (null when unknown). */
  private fun mapFormatString(format: String): Int? =
    when (format) {
      "QR_CODE" -> HmsScan.QRCODE_SCAN_TYPE
      "AZTEC" -> HmsScan.AZTEC_SCAN_TYPE
      "DATA_MATRIX" -> HmsScan.DATAMATRIX_SCAN_TYPE
      "PDF417" -> HmsScan.PDF417_SCAN_TYPE
      "CODABAR" -> HmsScan.CODABAR_SCAN_TYPE
      "CODE_39" -> HmsScan.CODE39_SCAN_TYPE
      "CODE_93" -> HmsScan.CODE93_SCAN_TYPE
      "CODE_128" -> HmsScan.CODE128_SCAN_TYPE
      "EAN_8" -> HmsScan.EAN8_SCAN_TYPE
      "EAN_13" -> HmsScan.EAN13_SCAN_TYPE
      "UPC_A" -> HmsScan.UPCCODE_A_SCAN_TYPE
      "UPC_E" -> HmsScan.UPCCODE_E_SCAN_TYPE
      "ITF14" -> HmsScan.ITF14_SCAN_TYPE
      "MULTI_FUNCTIONAL" -> HmsScan.MULTI_FUNCTIONAL_SCAN_TYPE
      else -> null
    }

  /**
   * HmsScan.getScanTypeForm() (content semantic) -> unified BarcodeContentType
   * string. Unrecognized / generic forms map to "OTHER".
   *
   * Uses the named HmsScan.*_FORM constants (public static final ints) rather than
   * hard-coded numbers so the mapping stays correct across SDK versions.
   */
  private fun mapContentType(form: Int): String =
    when (form) {
      HmsScan.URL_FORM -> "URL"
      HmsScan.EMAIL_CONTENT_FORM -> "EMAIL"
      HmsScan.TEL_PHONE_NUMBER_FORM -> "PHONE"
      HmsScan.SMS_FORM -> "SMS"
      HmsScan.WIFI_CONNECT_INFO_FORM -> "WIFI"
      HmsScan.CONTACT_DETAIL_FORM -> "CONTACT"
      HmsScan.EVENT_INFO_FORM -> "EVENT"
      HmsScan.LOCATION_COORDINATE_FORM -> "LOCATION"
      HmsScan.DRIVER_INFO_FORM -> "DRIVER"
      HmsScan.ISBN_NUMBER_FORM -> "ISBN"
      HmsScan.ARTICLE_NUMBER_FORM -> "ARTICLE"
      HmsScan.PURE_TEXT_FORM -> "TEXT"
      else -> "OTHER"
    }
}
