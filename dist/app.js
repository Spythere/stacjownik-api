"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors = require('cors');
const app = express_1.default();
const PORT = process.env.PORT || 3001;
const allowedSites = ['https://stacjownik-td2.web.app', 'http://localhost:8080'];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, false);
        if (allowedSites.indexOf(origin) == -1) {
            const msg = `Strona ${origin} nie ma dostępu do danych tego API! W celu uzyskania dostępu skontaktuj się z Spythere na forum TD2 bądź Discordzie!`;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
};
app.use(cors(corsOptions));
app.use(express_1.default.json());
app.use('/api', require('./api/apiRouter'));
app.get('/', (req, res) => {
    res.status(200).send({ msg: 'Witaj! Korzystasz teraz z API Stacjownika!', status: 200, statusLoaded: true });
});
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
