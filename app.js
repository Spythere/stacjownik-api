const express = require('express');
const cors = require('cors');
const app = express();

const PORT = process.env.PORT || 3001;

const allowedSites = ["https://stacjownik-td2.web.app"];

app.use(express.json());
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, false);

        if (allowedSites.indexOf(origin) == -1) {
            const msg = `Strona ${origin} nie ma dostępu do danych tego API! W celu uzyskania dostępu skontaktuj się z Spythere na forum TD2 bądź Discordzie!`;
            return callback(new Error(msg), false);
        }

        return callback(null, true);
    }
}));

app.use("/api", require('./api/apiRouter'));

app.get('/', (req, res) => {
    res.status(200).send("Chyba działa! :)");
}); 

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));