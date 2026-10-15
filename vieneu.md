# Hướng dẫn sử dụng VieNeu TTS API (CIT Voice Studio)

## 1. Tổng quan

**CIT Voice Studio** (tích hợp mô hình VieNeu-TTS) là nền tảng AI tổng hợp giọng nói tiếng Việt chất lượng phòng thu (Offline & On-Device):

- **Địa chỉ mặc định**: `http://127.0.0.1:8001`
- **Swagger Docs**: [http://127.0.0.1:8001/docs](http://127.0.0.1:8001/docs)
- **OpenAPI Schema**: [http://127.0.0.1:8001/openapi.json](http://127.0.0.1:8001/openapi.json)
- **Đặc điểm nổi bật**:
  - Không tốn chi phí API, không giới hạn request/phút.
  - Phản hồi đồng bộ tức thì, độ trễ cực thấp (TTFA ~100-300ms) qua giao thức Chunked Streaming.
  - Chất lượng âm thanh chuẩn phòng thu **48 kHz** (VieNeu-TTS v3 Turbo), đa dạng vùng miền (Bắc, Trung, Nam).
  - Hỗ trợ **Thẻ cảm xúc** (`[cười]`, `[hắng giọng]`, `[thở dài]`) và **Thẻ nghỉ** (`[nghỉ 1s]`, `[nghỉ 2s]`).
  - Hỗ trợ **Từ điển phát âm** và giọng nhân bản (Clone Voice) được tạo trong ứng dụng.

---

## 2. Thiết lập trong `.env`

Tại file `.env` ở thư mục gốc của repository:

```env
# ── TTS Provider ─────────────────────────────────────────────
# "vieneu" = VieNeu TTS (local / CIT Voice Studio) | "edge" = Edge TTS (miễn phí) | "vbee" = Vbee TTS
TTS_PROVIDER=vieneu

# ── VieNeu TTS (chỉ cần khi TTS_PROVIDER=vieneu) ────────────
VIENEU_API_URL=http://127.0.0.1:8001
# API Key (chỉ cần khi gọi tới máy khác trong mạng LAN)
VIENEU_API_KEY=
# Giọng đọc mặc định: Hải Đăng, Adam bựa, Trúc Ly, Thiện Minh, Mai Anh, Thùy Dung...
VIENEU_VOICE=Hải Đăng
# Tốc độ đọc (1.0 = chuẩn, từ 0.5 đến 2.0)
VIENEU_SPEED=1.0
```

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `TTS_PROVIDER` | `vieneu` | Chọn provider sinh voiceover (`vieneu`, `edge`, hoặc `vbee`). |
| `VIENEU_API_URL` | `http://127.0.0.1:8001` | Địa chỉ server CIT Voice Studio đang chạy. |
| `VIENEU_API_KEY` | *(trống)* | Khoá xác thực (chỉ cần khi bật *Cho máy khác truy cập* qua mạng LAN). |
| `VIENEU_VOICE` | `Hải Đăng` | Tên giọng đọc (phân biệt dấu tiếng Việt). |
| `VIENEU_SPEED` | `1.0` | Tốc độ đọc (1.0 = chuẩn). |

---

## 3. Các Endpoint API Chính

### 3.1. Kiểm tra trạng thái máy chủ - `GET /health`

```http
GET /health
```

**Response mẫu (200 OK):**
```json
{
  "status": "ok",
  "message": "Sẵn sàng",
  "sample_rate": 48000,
  "engine": "VieNeu-TTS-v3-Turbo (int8)",
  "backend": "onnx",
  "precision": "int8",
  "device": "cpu",
  "languages": [],
  "supports_cloning": true
}
```

### 3.2. Lấy danh sách giọng đọc - `GET /voices`

```http
GET /voices
```

Trả về mảng JSON chứa 25 giọng mặc định của VieNeu-TTS v3 Turbo cùng các giọng nhân bản (nếu người dùng đã clone trong app).

### 3.3. Sinh Voiceover - `POST /api/tts/generate`

```http
POST /api/tts/generate
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "Chào mừng bạn đến với kênh so sánh kiến thức. [cười] Hôm nay có một chủ đề rất thú vị! [nghỉ 1s] Hãy cùng khám phá.",
  "voice_id": "Hải Đăng",
  "speed": 1.0,
  "temperature": 0.7,
  "format": "mp3",
  "use_pronunciation_dict": true
}
```

**Response Headers quan trọng:**
- `X-Duration-Seconds`: Thời lượng audio (giây).
- `X-Elapsed-Seconds`: Thời gian AI tạo audio.
- `X-RTF`: Real-Time Factor (< 1 là nhanh hơn thời gian thực).
- `X-Sample-Rate`: Tần số âm thanh (48000).

### 3.4. Sinh Voiceover kèm Phụ đề SRT - `POST /api/tts/generate-with-subtitles`

Trả về JSON gồm `audio_base64`, `srt` và mảng `cues` đo độ dài audio từng câu chuẩn xác.

### 3.5. Streaming TTS thời gian thực - `GET /stream`

```http
GET /stream?text=Xin+chào&voice_id=Hải+Đăng
```

Phát âm thanh dạng WAV chunked trực tiếp với độ trễ chỉ 100-300ms.

---

## 4. Thẻ Cảm Xúc & Thẻ Nghỉ

Hỗ trợ trực tiếp trong văn bản `text` gửi tới API:

- `[cười]`: Thêm biểu cảm vui tươi, tiếng cười tự nhiên.
- `[hắng giọng]`: Thêm động tác hắng giọng, chuẩn bị nói hoặc ngắt nhịp trịnh trọng.
- `[thở dài]`: Thêm hơi thở dài, trầm ngâm hoặc thất vọng nhẹ.
- `[nghỉ 1s]`, `[nghỉ 2s]`, `[nghỉ 500ms]`: Chèn khoảng im lặng chuẩn xác (tối đa 10 giây mỗi thẻ). Không bị đọc thành tiếng.

*Ví dụ:*
```text
"AI tạo sinh [nghỉ 1.5s] đang thay đổi thế giới bóng đá! [cười] Bạn đã sẵn sàng chưa?"
```

---

## 5. Danh Sách 25 Giọng Đọc Có Sẵn (VieNeu-TTS v3 Turbo - 48 kHz)

| Tên giọng (`VIENEU_VOICE`) | Giới tính | Miền | Phong cách |
|---|---|---|---|
| **Hải Đăng** *(Mặc định)* | Nam | Bắc | Phong cách tự nhiên · 48 kHz |
| **Adam bựa** | Nam | Bắc | Phong cách tự nhiên, hài hước · 48 kHz |
| **Trúc Ly** | Nữ | Bắc | Phong cách tự nhiên, truyền cảm · 48 kHz |
| **Thiện Minh** | Nam | Bắc | Phong cách kể chuyện · 48 kHz |
| **Mai Anh** | Nữ | Bắc | Phong cách tin tức · 48 kHz |
| **Thùy Dung** | Nữ | Nam | Phong cách tin tức · 48 kHz |
| **Thiền Tâm Đức** | Nam | Bắc | Phong cách kể chuyện · 48 kHz |
| **Ngọc Huyền** | Nữ | Bắc | Giọng đọc tự nhiên · 48 kHz |
| **Quang Sơn** | Nam | Trung | Phong cách tự nhiên · 48 kHz |
| **Ngọc Trân** | Nữ | Trung | Phong cách tự nhiên · 48 kHz |
| **Minh Đức** | Nam | Bắc | Phong cách tin tức · 48 kHz |
| **Phạm Tuyên** | Nam | Bắc | Phong cách tự nhiên · 48 kHz |
| **Thái Sơn** | Nam | Nam | Phong cách kể chuyện · 48 kHz |
| **Xuân Vĩnh** | Nam | Bắc | Phong cách tự nhiên · 48 kHz |
| **Thanh Bình** | Nam | Bắc | Phong cách kể chuyện · 48 kHz |
| **Ngọc Linh** | Nữ | Bắc | Phong cách kể chuyện · 48 kHz |
| **Đoan Trang** | Nữ | Bắc | Phong cách tự nhiên · 48 kHz |
| **Thục Đoan** | Nữ | Nam | Phong cách kể chuyện · 48 kHz |
| **Minh Triết** | Nam | Nam | Phong cách tin tức · 48 kHz |
| **Mỹ Duyên** | Nữ | Nam | Phong cách đọc truyện · 48 kHz |
| **Quỳnh Anh** | Nữ | Bắc | Phong cách đọc truyện · 48 kHz |
| **Đức Trí** | Nam | Nam | Phong cách đọc truyện · 48 kHz |
| **Kim Thanh** | Nữ | Nam | Phong cách đọc truyện · 48 kHz |
| **Adam** | Nam | Nam | Giọng đọc tự nhiên · 48 kHz |
| **Quốc Tuấn** | Nam | Bắc | Phong cách tự nhiên · 48 kHz |
