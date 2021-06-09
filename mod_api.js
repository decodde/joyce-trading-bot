const axios = require("axios").default;
axios.defaults.baseURL = "https://";
axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;
axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

const futureBase = ""
const mod_api = {
    
}


exports.mod_api = mod_api