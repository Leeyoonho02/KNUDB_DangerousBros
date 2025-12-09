const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// 로그인 확인
const requireLogin = (req, res, next) => {
    console.log('Checking login. Session user:', req.session.user);
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
};

// 기본 화면
router.get('/', (req, res) => {
    res.render('explorer/index');
});

// 이펙터 추가
router.get('/add-model', requireLogin, (req, res) => {
    res.render('explorer/add-model');
});

// 이펙터 추가
router.post('/add-model', requireLogin, async (req, res) => {
    const { name, manufacturer, type } = req.body;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        const idResult = await connection.execute(`SELECT MAX(Model_ID) AS MAX_ID FROM EFFECTOR_MODEL`);
        const newId = (idResult.rows[0].MAX_ID || 0) + 1;

        const sql = `
            INSERT INTO EFFECTOR_MODEL (Model_ID, Model_name, Manufacturer, Effector_type, User_ID)
            VALUES (:id, :name, :manufacturer, :type, :userId)
        `;
        
        await connection.execute(sql, {
            id: newId,
            name: name,
            manufacturer: manufacturer,
            type: type,
            userId: userId
        });

        await connection.commit();

        res.redirect('/explorer');
    } catch (err) {
        console.error("Error adding effector model:", err);
        res.status(500).send("Server Error while adding effector model.");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error closing connection:", err);
            }
        }
    }
});



module.exports = router;
