const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// GET 로그인
router.get('/login', (req, res) => {
    res.render('login');
});

// POST 로그인
router.post('/login', async (req, res) => {
    const { id, password } = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection();
        
        await connection.execute(`ALTER SESSION SET NLS_COMP=BINARY`);

        // const sql = `SELECT * FROM USR WHERE TRIM(User_ID) = :id AND TRIM(User_PW) = :password`;
        // const result = await connection.execute(sql, [id.trim(), password.trim()], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        const sql = `SELECT * 
    FROM USR 
    WHERE TRIM(User_ID) = :id 
      AND TRIM(User_PW) = :password`;

    const result = await connection.execute(
        sql,
        {
            id: id.trim(),
            password: password.trim()
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );


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
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error(rbErr);
            }
        }
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

// GET 레지스터
router.get('/register', (req, res) => {
    res.render('register');
});

// POST 레지스터
router.post('/register', async (req, res) => {
    const { id, password, name, email } = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection();
        const sql = `INSERT INTO USR (User_ID, User_PW, User_name, User_mail) VALUES (:id, :password, :name, :email)`;
        await connection.execute(sql, [id.trim(), password.trim(), name.trim(), email.trim()]);

        await connection.commit();

        res.send('<script>alert("회원가입이 완료되었습니다. 로그인해주세요."); window.location.href="/auth/login";</script>');
    } catch (err) {
        console.error(err);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error(rbErr);
            }
        }
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

// 로그아웃
router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;