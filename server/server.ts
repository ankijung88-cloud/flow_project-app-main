import express from "express";
import path from "path";

const app = express();
const PORT = 5173;

// 빌드된 결과물(dist)을 정적 파일로 제공합니다.
app.use(express.static(path.join(__dirname, "dist")));

// 모든 경로에서 index.html을 반환하여 Client-Side Routing을 지원합니다.
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Node.js 서버 실행 중: http://localhost:${PORT}`);
});
