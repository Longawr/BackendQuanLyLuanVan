# Backend Quản lý đồ án.
Quản lý đồ án của sinh viên đồng thời sử dụng "Plagiarism Checker and Auto Citation Generator Multi-Lingual" của Smodin trên rapidAPI để phát hiện đạo văn.

## Hướng dẫn cài đặt:
- Tải source code về và cài đầy đủ thư viện yêu cầu (npm install)
- Tạo một cluster trên server của mongodb và tạo database trong đó.
- Thêm IP 0.0.0.0 vào danh sách IP được phép truy cập trong cluster để mọi IP đều có thể truy cập vào database.
- Tạo tài khoản mega.nz để lưu file.
- Tạo 1 tài khoản RapidAPI và subscribe plagiarism checker tại https://rapidapi.com/smodin/api/plagiarism-checker-and-auto-citation-generator-multi-lingual.
- Tạo file .env trong thư mục gốc của project và tạo các biến môi trường:
  + PORT là cổng chạy backend.
  + DB_USERNAME là username dùng để đăng nhập vào mongodb.
  + DB_PASSWORD là password cho DB_USERNAME.
  + DB_CLUSTER là đường dẫn đến cluster có chứa databse của bạn trên server mongodb.
  + DB_NAME là tên của database.
  + ACCESS_TOKEN_SECRET là khoá bí mật để mã hoá access token.
  + REFRESH_TOKEN_SECRET là khoá bí mật để mã hoá refresh token.
  + SESSION_SECRET là khoá bí mật để mã hoá session.
  + COOKIE_SECRET là khoá bí mật để mã hoá cookie.
  + MEGANZ_EMAIL= là email đã dùng để tạo tài khoản mega.nz.
  + MEGANZ_PASSWORD= là mật khẩu cho tài khoản mega.nz.
  + MEGANZ_USER_AGENT= là tên đại diện cho phiên truy cập, có thể đặt tên bất kỳ.
  + API_KEY= là api key của tài khoản của bạn trên rapid API.

## Tài liệu API:
### [POST] /auth/login
- Body:
  + id: String,
  + password: String
- Response:
  + expiredAt: Date as String,
  + role: String
- E.g.: Axios:
```
const url = "/auth/login";
const body = { id: "CN001", password: "123456@A" };

const { expiredAt, role } = api.post(url, body).then(({ data }) => data);
```

