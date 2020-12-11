const express = require('express');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(cors());

app.use("/api", require('./api/apiRouter'));

app.get('/', (req, res) => {
    res.status(200).send("Chyba działa! :)");
}); 

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));