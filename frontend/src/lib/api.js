import axios from "axios";
// 운영 환경에서는 nginx가 /api/ 를 springboot-app:8080 으로 라우팅한다.
// (WESS_구성현황.md 4번 항목 참고)
export const api = axios.create({
    baseURL: "/api",
    timeout: 10000,
});
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("wess_token");
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
api.interceptors.response.use((res) => res, (err) => {
    if (err?.response?.status === 401) {
        localStorage.removeItem("wess_token");
        localStorage.removeItem("wess_user");
    }
    return Promise.reject(err);
});
