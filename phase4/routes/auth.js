const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// GET Login Page
router.get('/login', (req, res) => {
    res.render('login');
});

// POST Login
router.post('/login', async (req, res) => {
    const { id, password } = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection();
        const sql = `SELECT * FROM USR WHERE User_ID = :id AND User_PW = :password`;
        const result = await connection.execute(sql, [id, password], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (result.rows.length > 0) {
            const user = result.rows[0];
            req.session.user = {
                id: user.USER_ID,
                name: user.USER_NAME,
                email: user.USER_MAIL
            };
            res.redirect('/');
        } else {
            res.send('<script>alert("아이디 또는 비밀번호가 일치하지 않습니다."); window.location.href="/auth/login";</script>');
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

// GET Register Page
router.get('/register', (req, res) => {
    res.render('register');
});

// POST Register
router.post('/register', async (req, res) => {
    const { id, password, name, email } = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection();
        const sql = `INSERT INTO USR (User_ID, User_PW, User_name, User_mail) VALUES (:id, :password, :name, :email)`;
        await connection.execute(sql, [id, password, name, email], { autoCommit: true });

        // Auto login after register? Or just redirect to login
        res.send('<script>alert("회원가입이 완료되었습니다. 로그인해주세요."); window.location.href="/auth/login";</script>');
    } catch (err) {
        console.error(err);
        res.send('<script>alert("회원가입 실패. 이미 존재하는 아이디일 수 있습니다."); window.location.href="/auth/register";</script>');
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;
