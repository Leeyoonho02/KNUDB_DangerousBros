const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('index', { title: 'Dangerous Bros Pedalboard System' });
});

module.exports = router;
