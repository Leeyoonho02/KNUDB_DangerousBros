const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
};

router.use(requireLogin);

// GET My Page Menu
router.get('/', (req, res) => {
    res.render('mypage/index');
});

// GET My Boards (Type 8: Order By)
router.get('/boards', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        // Type 8: Order By Registration Date
        const sql = `
            SELECT * FROM PEDALBOARD 
            WHERE User_ID = :userId 
            ORDER BY Registeration_date ASC
        `;
        const result = await connection.execute(sql, [req.session.user.id], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.render('mypage/boards', { boards: result.rows });
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

// GET Update User
router.get('/update', (req, res) => {
    res.render('mypage/update');
});

// POST Update User
router.post('/update', async (req, res) => {
    const { password, name, email } = req.body;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        let sql, params;
        if (password && password.trim() !== "") {
            sql = `UPDATE USR SET User_PW = :password, User_name = :name, User_mail = :email WHERE User_ID = :userId`;
            params = [password, name, email, userId];
        } else {
            sql = `UPDATE USR SET User_name = :name, User_mail = :email WHERE User_ID = :userId`;
            params = [name, email, userId];
        }

        await connection.execute(sql, params);

        // Update session info
        req.session.user.name = name;
        req.session.user.email = email;

        res.send('<script>alert("회원 정보가 수정되었습니다."); window.location.href="/mypage";</script>');
    } catch (err) {
        console.error(err);
        res.send('<script>alert("회원 정보 수정 실패."); window.location.href="/mypage/update";</script>');
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

// GET Delete User
router.get('/delete', (req, res) => {
    res.render('mypage/delete');
});

// POST Delete User
router.post('/delete', async (req, res) => {
    const { password } = req.body;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // Check password first
        const checkSql = `SELECT * FROM USR WHERE User_ID = :userId AND User_PW = :password`;
        const checkResult = await connection.execute(checkSql, [userId, password]);

        if (checkResult.rows.length > 0) {
            const deleteSql = `DELETE FROM USR WHERE User_ID = :userId`;
            await connection.execute(deleteSql, [userId]);

            req.session.destroy(() => {
                res.send('<script>alert("회원 탈퇴가 완료되었습니다."); window.location.href="/";</script>');
            });
        } else {
            res.send('<script>alert("비밀번호가 일치하지 않습니다."); window.location.href="/mypage/delete";</script>');
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

module.exports = router;
