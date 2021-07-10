const mailjet = require ('node-mailjet')
.connect('a7ac20901a0de0a759e473bb48ab7421', '485bc19755ea9b9408f3cbe3b4755aa4')
const request = mailjet
.post("send", {'version': 'v3.1'})
.request({
  "Messages":[
    {
      "From": {
        "Email": "rocket125x@rocket125x.com",
        "Name": "Fasina"
      },
      "To": [
        {
          "Email": "dannyoma75@gmail.com",
          "Name": "Fasina"
        }
      ],
      "Subject": "Greetings from Mailjet.",
      "TextPart": "My first Mailjet email",
      "HTMLPart": "<h3>Dear passenger 1, welcome to <a href='https://www.mailjet.com/'>Mailjet</a>!</h3><br />May the delivery force be with you!",
      "CustomID": "AppGettingStartedTest"
    }
  ]
})
request
  .then((result) => {
    console.log(result.body)
  })
  .catch((err) => {
    console.log(err.statusCode)
  })