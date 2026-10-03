package com.unif.reactnativehmsscan

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.media.ExifInterface
import android.net.Uri
import java.io.Closeable
import java.io.File
import java.io.FileInputStream
import java.io.IOException

internal class ScanImageFailure(
  val code: String,
  message: String,
) : IOException(message)

/** Owns one upright bitmap; points are returned in the upright original image. */
internal class HmsScanImage private constructor(
  val bitmap: Bitmap,
  val scaleX: Double,
  val scaleY: Double,
) : Closeable {
  override fun close() {
    if (!bitmap.isRecycled) bitmap.recycle()
  }

  companion object {
    // At most 32 MiB per ARGB bitmap, temporarily 64 MiB during EXIF rotation.
    // The vendor has additional working memory. Only one image job runs at once.
    private const val MAX_PIXELS = 8_388_608L
    private const val MAX_SOURCE_PIXELS = 268_435_456L
    private const val MAX_SOURCE_EDGE = 32_768
    private const val MAX_FILE_BYTES = 128L * 1024 * 1024

    fun read(uri: String): HmsScanImage {
      val parsed = Uri.parse(uri)
      val path = parsed.path
      if (!parsed.scheme.equals("file", ignoreCase = true) || path.isNullOrEmpty()) {
        throw ScanImageFailure("E_INVALID_INPUT", "需要可读的 file URI")
      }
      val file = File(path)
      if (!file.isFile || !file.canRead()) {
        throw ScanImageFailure("E_IMAGE_LOAD_FAILED", "无法读取本地图片")
      }
      if (file.length() > MAX_FILE_BYTES) {
        throw ScanImageFailure("E_INVALID_INPUT", "图片文件超过 128 MiB")
      }
      val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
      BitmapFactory.decodeFile(path, bounds)
      val width = bounds.outWidth
      val height = bounds.outHeight
      if (width <= 0 || height <= 0) {
        throw ScanImageFailure("E_IMAGE_LOAD_FAILED", "无法读取图片尺寸")
      }
      if (width > MAX_SOURCE_EDGE || height > MAX_SOURCE_EDGE || width.toLong() * height > MAX_SOURCE_PIXELS) {
        throw ScanImageFailure("E_INVALID_INPUT", "图片尺寸超过安全解码范围")
      }
      var sample = 1
      while (((width + sample - 1) / sample).toLong() * ((height + sample - 1) / sample) > MAX_PIXELS) {
        sample *= 2
      }
      val options =
        BitmapFactory.Options().apply {
          inSampleSize = sample
          inPreferredConfig = Bitmap.Config.ARGB_8888
        }
      var bitmap =
        BitmapFactory.decodeFile(path, options)
          ?: throw ScanImageFailure("E_IMAGE_LOAD_FAILED", "无法解码本地图片")
      try {
        if (bitmap.width.toLong() * bitmap.height > MAX_PIXELS || bitmap.allocationByteCount.toLong() > MAX_PIXELS * 4) {
          throw ScanImageFailure("E_INVALID_INPUT", "图片解码超过内存预算")
        }
        // Unsupported/missing optional EXIF does not discard an otherwise valid image.
        val orientation =
          try {
            FileInputStream(file).use {
              ExifInterface(it).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
            }
          } catch (_: IOException) {
            ExifInterface.ORIENTATION_NORMAL
          }
        val matrix = Matrix()
        when (orientation) {
          ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> {
            matrix.setScale(-1f, 1f)
          }

          ExifInterface.ORIENTATION_ROTATE_180 -> {
            matrix.setRotate(180f)
          }

          ExifInterface.ORIENTATION_FLIP_VERTICAL -> {
            matrix.setScale(1f, -1f)
          }

          ExifInterface.ORIENTATION_TRANSPOSE -> {
            matrix.setRotate(90f)
            matrix.postScale(-1f, 1f)
          }

          ExifInterface.ORIENTATION_ROTATE_90 -> {
            matrix.setRotate(90f)
          }

          ExifInterface.ORIENTATION_TRANSVERSE -> {
            matrix.setRotate(270f)
            matrix.postScale(-1f, 1f)
          }

          ExifInterface.ORIENTATION_ROTATE_270 -> {
            matrix.setRotate(270f)
          }
        }
        if (orientation in ExifInterface.ORIENTATION_FLIP_HORIZONTAL..ExifInterface.ORIENTATION_ROTATE_270) {
          val upright = Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
          if (upright !== bitmap) {
            bitmap.recycle()
            bitmap = upright
          }
        }
        val swapsAxes = orientation in ExifInterface.ORIENTATION_TRANSPOSE..ExifInterface.ORIENTATION_ROTATE_270
        return HmsScanImage(
          bitmap,
          (if (swapsAxes) height else width).toDouble() / bitmap.width,
          (if (swapsAxes) width else height).toDouble() / bitmap.height,
        )
      } catch (error: Throwable) {
        if (!bitmap.isRecycled) bitmap.recycle()
        throw error
      }
    }
  }
}
