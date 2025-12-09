const express = require('express');
const oracledb = require('oracledb');
const dbConfig = require('./config/dbConfig');
const morgan = require('morgan');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;


// 미들웨어
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'dangerous_bros_secret_key',
    resave: false,
    saveUninitialized: true
}));

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 전역 변수 설정
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

// 라우트 설정
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const mypageRouter = require('./routes/mypage');
const explorerRouter = require('./routes/explorer');
//const statisticsRouter = require('./routes/statistics');

app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/mypage', mypageRouter);
app.use('/explorer', explorerRouter);
//app.use('/statistics', statisticsRouter);

// 서버 로그 및 시작
async function startServer() {
    try {
        await oracledb.createPool(dbConfig);
        console.log('Oracle DB Connection Pool created');

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to create DB pool', err);
        process.exit(1);
    }
}

startServer();

// 종료 DB 풀 닫기
process.on('SIGINT', async () => {
    try {
        await oracledb.getPool().close(10);
        console.log('DB Pool closed');
        process.exit(0);
    } catch (err) {
        console.error('Error closing DB pool', err);
        process.exit(1);
    }
});
