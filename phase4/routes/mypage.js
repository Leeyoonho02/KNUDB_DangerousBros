const express = require('express');
const router = express.Router();
const oracledb = require('oracledb');

// 로그인 체크
const requireLogin = (req, res, next) => {
    console.log('Checking login. Session user:', req.session.user);
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    next();
};

router.use(requireLogin);

// GET 마이페이지 메뉴
router.get('/', (req, res) => {
    res.render('mypage/index');
});

// GET 내 보드 조회 (Type 8: Order By)
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

// GET 유저 수정
router.get('/update', (req, res) => {
    res.render('mypage/update');
});

// POST 유저 수정
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
        await connection.commit();

        // 세션 업데이트
        req.session.user.name = name;
        req.session.user.email = email;

        res.send('<script>alert("회원 정보가 수정되었습니다."); window.location.href="/mypage";</script>');
    } catch (err) {
        console.error(err);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error(rbErr);
            }
        }
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

// GET 유저 삭제
router.get('/delete', (req, res) => {
    res.render('mypage/delete');
});

// POST 유저 삭제
router.post('/delete', async (req, res) => {
    const { password } = req.body;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // 비번 확인
        const checkSql = `SELECT * FROM USR WHERE User_ID = :userId AND User_PW = :password`;
        const checkResult = await connection.execute(checkSql, [userId, password]);

        if (checkResult.rows.length > 0) {
            const getInClauseBind = (arr, prefix) => {
                if (!arr || arr.length === 0) {
                    return { placeholders: '', binds: {} };
                }
                
                const placeholders = arr.map((_, i) => `:${prefix}${i}`).join(', ');
                const binds = {};
                arr.forEach((val, i) => {
                    binds[`${prefix}${i}`] = val;
                });
                return { placeholders, binds };
            };

            console.log('--- User Deletion Debug Log ---');
            // 0. 필요한 모든 ID 미리 가져오기
            const userPedalboardIdsResult = await connection.execute(`SELECT Pedalboard_ID FROM PEDALBOARD WHERE User_ID = :userId`, { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            const userPedalboardIds = userPedalboardIdsResult.rows.map(row => row.PEDALBOARD_ID);
            console.log('userPedalboardIds:', userPedalboardIds);

            const userModelIdsResult = await connection.execute(`SELECT Model_ID FROM EFFECTOR_MODEL WHERE User_ID = :userId`, { userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            const userModelIds = userModelIdsResult.rows.map(row => row.MODEL_ID);
            console.log('userModelIds:', userModelIds);

            // 1. PARAMETER_VALUE 삭제: 사용자 페달보드 또는 사용자 모델을 참조하는 모든 파라미터 값 삭제
            //    -> 사용자 페달보드에 있는 아이템의 파라미터 값 AND 다른 사용자 페달보드라도 사용자 모델을 쓰는 아이템의 파라미터 값
            let deleteParamValueSql = `DELETE FROM PARAMETER_VALUE WHERE 1 = 0`; // Always false, will be extended
            let deleteParamValueBinds = {};
            let paramValueConditions = [];

            if (userPedalboardIds.length > 0) {
                const { placeholders, binds } = getInClauseBind(userPedalboardIds, 'pb_pv_');
                paramValueConditions.push(`Pedalboard_ID IN (${placeholders})`);
                Object.assign(deleteParamValueBinds, binds);
            }
            if (userModelIds.length > 0) {
                const { placeholders, binds } = getInClauseBind(userModelIds, 'md_pv_');
                paramValueConditions.push(`Model_ID IN (${placeholders})`);
                Object.assign(deleteParamValueBinds, binds);
            }

            if (paramValueConditions.length > 0) {
                deleteParamValueSql = `DELETE FROM PARAMETER_VALUE WHERE ${paramValueConditions.join(' OR ')}`;
                console.log('Executing PARAMETER_VALUE delete SQL:', deleteParamValueSql);
                console.log('PARAMETER_VALUE delete Binds:', deleteParamValueBinds);
                await connection.execute(deleteParamValueSql, deleteParamValueBinds);
            }


            // 2. BOARD_ITEM 삭제: 사용자 페달보드에 있는 아이템 또는 사용자 모델을 참조하는 아이템 삭제
            //    -> 다른 사용자 페달보드라도 사용자 모델을 쓰는 아이템도 삭제
            let deleteBoardItemSql = `DELETE FROM BOARD_ITEM WHERE 1 = 0`; // Always false, will be extended
            let deleteBoardItemBinds = {};
            let boardItemConditions = [];

            if (userPedalboardIds.length > 0) {
                const { placeholders, binds } = getInClauseBind(userPedalboardIds, 'pb_bi_');
                boardItemConditions.push(`Pedalboard_ID IN (${placeholders})`);
                Object.assign(deleteBoardItemBinds, binds);
            }
            if (userModelIds.length > 0) {
                const { placeholders, binds } = getInClauseBind(userModelIds, 'md_bi_');
                boardItemConditions.push(`Model_ID IN (${placeholders})`);
                Object.assign(deleteBoardItemBinds, binds);
            }

            if (boardItemConditions.length > 0) {
                deleteBoardItemSql = `DELETE FROM BOARD_ITEM WHERE ${boardItemConditions.join(' OR ')}`;
                console.log('Executing BOARD_ITEM delete SQL:', deleteBoardItemSql);
                console.log('BOARD_ITEM delete Binds:', deleteBoardItemBinds);
                await connection.execute(deleteBoardItemSql, deleteBoardItemBinds);
            }

            // 3. RATING 삭제: 사용자가 남긴 평가 및 사용자의 페달보드에 대한 평가 삭제
            let deleteRatingSql = `DELETE FROM RATING WHERE User_ID = :userId`;
            let deleteRatingBinds = { userId };
            if (userPedalboardIds.length > 0) {
                const { placeholders, binds } = getInClauseBind(userPedalboardIds, 'pb_rt_');
                deleteRatingSql += ` OR Pedalboard_ID IN (${placeholders})`;
                Object.assign(deleteRatingBinds, binds);
            }
            console.log('Executing RATING delete SQL:', deleteRatingSql);
            console.log('RATING delete Binds:', deleteRatingBinds);
            await connection.execute(deleteRatingSql, deleteRatingBinds);

            // 4. EFFECTOR_PARAMETER 삭제: 사용자 모델에 속한 파라미터 삭제
            if (userModelIds.length > 0) {
                const { placeholders, binds } = getInClauseBind(userModelIds, 'md_ep_');
                const deleteEffectorParamSql = `DELETE FROM EFFECTOR_PARAMETER WHERE Model_ID IN (${placeholders})`;
                console.log('Executing EFFECTOR_PARAMETER delete SQL:', deleteEffectorParamSql);
                console.log('EFFECTOR_PARAMETER delete Binds:', binds);
                await connection.execute(deleteEffectorParamSql, binds);
            }

            // 5. PEDALBOARD 삭제: 사용자가 소유한 페달보드 삭제
            const deletePedalboardSql = `DELETE FROM PEDALBOARD WHERE User_ID = :userId`;
            console.log('Executing PEDALBOARD delete SQL:', deletePedalboardSql);
            console.log('PEDALBOARD delete Binds:', { userId });
            await connection.execute(deletePedalboardSql, { userId });

            // 6. EFFECTOR_MODEL 삭제: 사용자가 소유한 이펙터 모델 삭제
            const deleteEffectorModelSql = `DELETE FROM EFFECTOR_MODEL WHERE User_ID = :userId`;
            console.log('Executing EFFECTOR_MODEL delete SQL:', deleteEffectorModelSql);
            console.log('EFFECTOR_MODEL delete Binds:', { userId });
            await connection.execute(deleteEffectorModelSql, { userId });

            // 7. USR 삭제: 사용자 본인 삭제
            const deleteUserSql = `DELETE FROM USR WHERE User_ID = :userId`;
            console.log('Executing USR delete SQL:', deleteUserSql);
            console.log('USR delete Binds:', { userId });
            await connection.execute(deleteUserSql, { userId });

            await connection.commit();

            req.session.destroy(() => {
                res.send('<script>alert("회원 탈퇴가 완료되었습니다."); window.location.href="/";</script>');
            });
        } else {
            res.send('<script>alert("비밀번호가 일치하지 않습니다."); window.location.href="/mypage/delete";</script>');
        }
    } catch (err) {
        console.error(err);
        if (connection) {
            try {
                await connection.rollback();
            } catch (rbErr) {
                console.error('Error during rollback:', rbErr);
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

// GET 페달보드 추가
router.get('/add-board', (req, res) => {
    //뒤로가기 처리
    if (req.headers.referer) {
        req.session.previousPage = req.headers.referer;
    } else {
        req.session.previousPage = '/mypage/boards'; //기본
    }
    res.render('mypage/add-board', { session: req.session });
});

// POST 페달보드 추가
router.post('/add-board', async (req, res) => {
    const { name, category } = req.body;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        const sql = `
            INSERT INTO PEDALBOARD (Pedalboard_ID, Pedalboard_name, Registeration_date, Pedalboard_category, User_ID)
            VALUES (pedalboard_seq.NEXTVAL, :name, SYSDATE, :category, :userId)
        `;
        
        await connection.execute(sql, {
            name: name,
            category: category,
            userId: userId
        });

        await connection.commit();

        const redirectPath = req.session.previousPage || '/mypage/boards';
        res.redirect(redirectPath);
    } catch (err) {
        console.error("Error adding pedalboard:", err);
        res.status(500).send("Server Error while adding pedalboard.");
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

// GET 이펙터 모델 목록
router.get('/models', async (req, res) => {
    let connection;
    try {
        connection = await oracledb.getConnection();
        const sql = `
            SELECT * FROM EFFECTOR_MODEL 
            WHERE User_ID = :userId 
            ORDER BY Model_name ASC
        `;
        const result = await connection.execute(sql, [req.session.user.id], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.render('mypage/models', { models: result.rows });
    } catch (err) {
        console.error("Error fetching effector models:", err);
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

// GET 이펙터 모델 상세
router.get('/model/:id', async (req, res) => {
    const modelId = req.params.id;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        

        // 1. 소유자 확인

        const modelSql = `SELECT * FROM EFFECTOR_MODEL WHERE Model_ID = :modelId AND User_ID = :userId`;

        const modelResult = await connection.execute(modelSql, { modelId, userId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        if (modelResult.rows.length === 0) {
            return res.status(404).send("모델을 찾을 수 없거나 접근 권한이 없습니다.");
        }
        
        //뒤로가기 처리(여러 곳에서 호출 가능하므로 세션에 저장)
        const referrer = req.headers.referer;
        // Only update the previousPage if the user is coming from a different page.
        if (referrer && !referrer.includes(`/mypage/model/${modelId}`)) {
            req.session.previousPage = referrer;
        } else if (!req.session.previousPage) {
            // If previousPage is not set at all, set a sensible default.
            req.session.previousPage = '/mypage/models';
        }

        // 2. 파라미터 조회
        const paramsSql = `SELECT Parameter_name, Description FROM EFFECTOR_PARAMETER WHERE Model_ID = :modelId`;
        const paramsResult = await connection.execute(paramsSql, { modelId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

        res.render('mypage/model-detail', {
            model: modelResult.rows[0],
            params: paramsResult.rows,
            session: req.session
        });

    } catch (err) {
        console.error("Error fetching model details:", err);
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

// POST 모델 파라미터 추가
router.post('/model/:id/add-parameter', async (req, res) => {
    const modelId = req.params.id;
    const userId = req.session.user.id;
    const { param_name, param_desc } = req.body;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // 1. 소유자 확인
        const ownerCheckSql = `SELECT User_ID FROM EFFECTOR_MODEL WHERE Model_ID = :modelId AND User_ID = :userId`;
        const ownerResult = await connection.execute(ownerCheckSql, { modelId, userId });

        if (ownerResult.rows.length === 0) {
            return res.status(403).send("권한이 없습니다.");
        }

        // 2. 새 파라미터 추가
        const paramSql = `
            INSERT INTO EFFECTOR_PARAMETER (Model_ID, Parameter_name, Description)
            VALUES (:modelId, :paramName, :paramDesc)
        `;
        await connection.execute(paramSql, { modelId, paramName: param_name, paramDesc: param_desc });

        await connection.commit();

        const redirectPath = req.session.previousPage || '/mypage/models';
        res.redirect(`/mypage/model/${modelId}`);
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).send("Server Error while adding parameter.");
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

// POST 모델 파라미터 삭제
router.post('/parameter/:modelId/:paramName/delete', async (req, res) => {
    const { modelId, paramName } = req.params;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // 1. 소유자 확인
        const ownerCheckSql = `SELECT User_ID FROM EFFECTOR_MODEL WHERE Model_ID = :modelId AND User_ID = :userId`;
        const ownerResult = await connection.execute(ownerCheckSql, { modelId, userId });

        if (ownerResult.rows.length === 0) {
            return res.status(403).send("권한이 없습니다.");
        }

        // 2. 파라미터 삭제
        const paramSql = `DELETE FROM EFFECTOR_PARAMETER WHERE Model_ID = :modelId AND Parameter_name = :paramName`;
        await connection.execute(paramSql, { modelId, paramName });

        await connection.commit();

        res.redirect(`/mypage/model/${modelId}`);
    } catch (err) {
        console.error("Error deleting parameter:", err);
        if (connection) await connection.rollback();
        res.status(500).send("Server Error while deleting parameter.");
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

// POST 이펙터 모델 삭제
router.post('/model/:id/delete', async (req, res) => {
    const modelId = req.params.id;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // 1. 소유자 확인
        const ownerCheckSql = `SELECT User_ID FROM EFFECTOR_MODEL WHERE Model_ID = :modelId AND User_ID = :userId`;
        const ownerResult = await connection.execute(ownerCheckSql, { modelId, userId });

        if (ownerResult.rows.length === 0) {
            return res.status(403).send("모델을 찾을 수 없거나 접근 권한이 없습니다.");
        }

        // 2. 다른 사람이 페달보드에 이 모델 사용중인지 확인
        const checkUsageSql = `SELECT COUNT(*) AS COUNT FROM BOARD_ITEM WHERE Model_ID = :modelId`;
        const usageResult = await connection.execute(checkUsageSql, { modelId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (usageResult.rows[0].COUNT > 0) {
            await connection.rollback();
            return res.send('<script>alert("이 모델은 페달보드에서 사용 중이므로 삭제할 수 없습니다."); window.location.href="/mypage/model/'+modelId+'";</script>');
        }

        // 3. 관련 파라미터 삭제
        await connection.execute(`DELETE FROM EFFECTOR_PARAMETER WHERE Model_ID = :modelId`, { modelId });

        // 4. 이펙터 모델 삭제
        await connection.execute(`DELETE FROM EFFECTOR_MODEL WHERE Model_ID = :modelId`, { modelId });

        await connection.commit();

        const redirectPath = req.session.previousPage || '/mypage/models';
        res.redirect(redirectPath);
    } catch (err) {
        console.error("Error deleting effector model:", err);
        if (connection) await connection.rollback();
        res.status(500).send("Server Error while deleting effector model.");
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

// GET 이펙터 모델 추가
router.get('/add-model', (req, res) => {
    //뒤로가기 처리(여러 곳에서 호출 가능하므로 세션에 저장)
    if (req.headers.referer) {
        req.session.previousPage = req.headers.referer;
    } else {
        req.session.previousPage = '/mypage/models'; //기본
    }
    res.render('mypage/add-model', { session: req.session });
});

// POST 이펙터 모델 추가
router.post('/add-model', async (req, res) => {
    const { name, manufacturer, type, param_name, param_desc } = req.body;
    const userId = req.session.user.id;
    let connection;

    try {
        connection = await oracledb.getConnection();

        // 1. 이펙터 모델 추가
        const modelSql = `
            INSERT INTO EFFECTOR_MODEL (Model_ID, Model_name, Manufacturer, Effector_type, User_ID)
            VALUES (effector_model_seq.NEXTVAL, :name, :manufacturer, :type, :userId)
            RETURNING Model_ID INTO :retId
        `;
        const modelResult = await connection.execute(modelSql, {
            name,
            manufacturer,
            type,
            userId,
            retId: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT }
        });
        
        const newId = modelResult.outBinds.retId[0];

        // 2. 파라미터 있으면 추가
        if (param_name) {
            const paramSql = `
                INSERT INTO EFFECTOR_PARAMETER (Model_ID, Parameter_name, Description)
                VALUES (:modelId, :paramName, :paramDesc)
            `;
            let params = [];
            if (Array.isArray(param_name)) {
                for (let i = 0; i < param_name.length; i++) {
                    // 비어있으면 건너뛰기
                    if(param_name[i].trim() !== '') {
                        params.push({
                            modelId: newId,
                            paramName: param_name[i],
                            paramDesc: param_desc[i]
                        });
                    }
                }
            } else { // 단일 입력 처리
                if(param_name.trim() !== '') {
                    params.push({
                        modelId: newId,
                        paramName: param_name,
                        paramDesc: param_desc
                    });
                }
            }
            
            if (params.length > 0) {
                await connection.executeMany(paramSql, params);
            }
        }

        await connection.commit();

        const redirectPath = req.session.previousPage || '/mypage/models';
        res.redirect(redirectPath);
    } catch (err) {
        console.error("Error adding effector model:", err);
        if (connection) await connection.rollback();
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
