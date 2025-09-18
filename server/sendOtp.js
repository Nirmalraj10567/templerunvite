const querystring = require('querystring');
const axios = require('axios');

const sendOtp = async (mobileNumber, otp) => {
  const apikey = "3fd55fb2b77b0a2980b2efe4a4ab8110";
  const route = "2";
  const senderid = "XESSTL";
  const templateid = "1607100000000332032";
  const sms = `Dear Customer your Registration Verification Code is ${otp}. Do not share this Code with Anyone - XessTL`;
  const encodedSms = querystring.escape(sms);
  const url = `http://sms.xesstechlink.com/api/smsapi?key=${apikey}&route=${route}&sender=${senderid}&number=${mobileNumber}&sms=${encodedSms}&templateid=${templateid}`;

  try {
    const response = await axios.get(url);
    console.log("SMS Status Code:", response.status);
    console.log("SMS Response Body:", response.data);
    return { success: true, response: response.data };
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    return { success: false, error: error.message };
  }
};

module.exports = sendOtp;