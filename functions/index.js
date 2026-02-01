const functions = require("firebase-functions");
const axios = require("axios");
const cors = require("cors")({ origin: true });

/**
 * Naver Directions API Proxy
 * This function allows the PWA to call Naver Directions API safely without CORS issues
 * and without exposing the Client Secret in the frontend code.
 */
exports.getNaverDirections = functions.https.onRequest((req, res) => {
    return cors(req, res, async () => {
        try {
            const { start, goal, waypoints, option = "traoptimal" } = req.query;

            if (!start || !goal) {
                return res.status(400).send("Missing start or goal coordinates.");
            }

            // Support both config() (traditional Gen 1) and process.env (.env files)
            const config = functions.config().naver || {};
            const clientId = (process.env.NAVER_CLIENT_ID || config.client_id || "").trim();
            const clientSecret = (process.env.NAVER_CLIENT_SECRET || config.client_secret || "").trim();

            // Detailed Debug Log (Masked for security)
            console.log(`[Proxy] Request Summary: ${start} -> ${goal} (${option})`);
            console.log(`[Proxy] Client ID: ${clientId.substring(0, 3)}*** (Length: ${clientId.length})`);
            console.log(`[Proxy] Client Secret: ${clientSecret.substring(0, 3)}*** (Length: ${clientSecret.length})`);

            if (!clientId || !clientSecret) {
                console.error("[Proxy] Critical: Naver credentials missing!");
                return res.status(500).json({ error: "Server Configuration Error: Missing Credentials" });
            }

            // Determine which URL to use. Default is Directions (v1).
            // Different NCP apps might enable different versions (Standard, 5, or 15).
            const urls = [
                "https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving",
                "https://naveropenapi.apigw.ntruss.com/map-direction-15/v1/driving",
                "https://naveropenapi.apigw.ntruss.com/map-direction-5/v1/driving"
            ];

            // Filter out empty params to avoid Naver API picky errors
            const params = { start, goal, option };
            if (waypoints && waypoints.trim() !== "") {
                params.waypoints = waypoints;
            }

            const incomingReferer = req.headers.referer || req.headers.origin || "https://roadflow-42618.web.app";

            let lastError = null;
            for (const url of urls) {
                try {
                    console.log(`[Proxy] Trying Naver API: ${url} (Referer: ${incomingReferer})`);
                    const response = await axios.get(url, {
                        params,
                        headers: {
                            "X-NCP-APIGW-API-KEY-ID": clientId,
                            "X-NCP-APIGW-API-KEY": clientSecret,
                            "Referer": incomingReferer
                        },
                    });

                    console.log(`[Proxy] Success with URL: ${url}`);
                    return res.status(200).json(response.data);
                } catch (error) {
                    lastError = error;
                    const status = error.response?.status;
                    const responseData = error.response?.data;

                    console.warn(`[Proxy] Failed with URL ${url} (Status: ${status})`);
                    if (responseData) {
                        console.warn("[Proxy] Naver Error Response:", JSON.stringify(responseData));
                    } else {
                        console.warn("[Proxy] No response data from Naver. Message:", error.message);
                    }

                    // Retry if it's 401 OR 404 (maybe specific version not enabled)
                    // If it's 400 (Bad Request), it's a coordinate/param issue, don't retry
                    if (status !== 401 && status !== 404) break;
                }
            }

            // If all failed
            const finalStatus = lastError.response?.status || 500;
            const finalData = lastError.response?.data || {
                error: { message: lastError.message, details: "All Naver API endpoints failed." }
            };

            console.error(`[Proxy] All attempts failed. Status ${finalStatus}`);
            res.status(finalStatus).json(finalData);
        } catch (globalError) {
            console.error("[Proxy] Unhandled Global Error:", globalError);
            res.status(500).json({ error: globalError.message });
        }
    });
});
