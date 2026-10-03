package org.json

private fun encode(value: Any?): String =
  when (value) {
    is String -> "\"" + value + "\""
    null -> "null"
    else -> value.toString()
  }

class JSONObject {
  val entries = linkedMapOf<String, Any?>()

  fun put(
    k: String,
    v: Any?,
  ) {
    entries[k] = v
  }

  override fun toString() =
    entries.entries.joinToString(",", "{", "}") {
      encode(it.key) +
        ":" +
        encode(it.value)
    }
}

class JSONArray {
  val entries = mutableListOf<Any?>()

  fun put(v: Any?) {
    entries.add(v)
  }

  fun length() = entries.size

  override fun toString() = entries.joinToString(",", "[", "]") { encode(it) }
}
