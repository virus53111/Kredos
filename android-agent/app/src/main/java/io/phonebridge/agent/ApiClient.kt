package io.phonebridge.agent

import android.os.Build
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

object ApiClient {
    data class ClaimResult(
        val agentId: String,
        val deviceToken: String,
        val heartbeatSeconds: Int
    )

    fun claim(pairingString: String): ClaimResult {
        val body = JSONObject()
            .put("pairingString", pairingString)
            .put("agentInfo", agentInfo())

        val response = post("/claim", body)
        return ClaimResult(
            agentId = response.getString("agentId"),
            deviceToken = response.getString("deviceToken"),
            heartbeatSeconds = response.optInt("heartbeatSeconds", 60)
        )
    }

    fun heartbeat(agentId: String, deviceToken: String): JSONObject {
        val body = JSONObject()
            .put("agentId", agentId)
            .put("deviceToken", deviceToken)
            .put("agentInfo", agentInfo())
        return post("/heartbeat", body)
    }

    private fun agentInfo(): JSONObject = JSONObject()
        .put("manufacturer", Build.MANUFACTURER)
        .put("model", Build.MODEL)
        .put("androidVersion", "Android ${Build.VERSION.RELEASE}")
        .put("appVersion", BuildConfig.VERSION_NAME)

    private fun post(path: String, body: JSONObject): JSONObject {
        val connection = (URL(BuildConfig.API_BASE_URL + path).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 25_000
            readTimeout = 25_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json; charset=utf-8")
            setRequestProperty("Accept", "application/json")
        }

        return try {
            connection.outputStream.use { out ->
                out.write(body.toString().toByteArray(Charsets.UTF_8))
            }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use { it.readText() }.orEmpty()
            if (code !in 200..299) throw IOException("HTTP $code: $text")
            if (text.isBlank()) JSONObject() else JSONObject(text)
        } finally {
            connection.disconnect()
        }
    }
}
