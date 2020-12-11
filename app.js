const express = require('express');
const app = express();

const PORT = process.env.port || 3001;

app.get('/', (req, res) => {
    res.status(200).send("Chyba działa! :)");
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));