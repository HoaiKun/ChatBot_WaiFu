import axios from 'axios';


// Tạo một bản instance riêng để dùng cho toàn app
 const api = axios.create({
    baseURL: 'http://localhost:8000/api/v1',
    withCredentials: true, // BẮT BUỘC: Để tự động gửi Refresh Token (Cookie)
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('waifu_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if(error.response?.status === 401 && !originalRequest._retry)
        {
            originalRequest._retry = true;
            try{
                const res = await axios.post('http://localhost:8000/api/v1/PostRefreshLogin', {}, { withCredentials: true });
                const newToken = res.data.access_token;

                localStorage.setItem('waifu_token', newToken);
                originalRequest.headers['Authorization'] = `Bearer ${newToken}`

                return api(originalRequest);
                }
            catch (err)
            {
                localStorage.removeItem('waifu_token');

                return Promise.reject(err);

            }

        }
        return Promise.reject(error);
    }
   
    
)

export default api;