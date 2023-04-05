const express = require("express");
const app = express();

app.get('/', function(req, res){
    res.sendFile('/app/public/index.html');
}); 

app.use(express.static('/app/public'))

app.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
