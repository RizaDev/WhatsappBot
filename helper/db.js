const mysql = require('mysql2/promise');

const createConnection = async () => {
    return await mysql.createConnection({
        host: 'localhost',
        user:'root',
        password: '',
        database:'dbnumber'
    });
}

const getReply = async (keyword) => {
    const con = await createConnection();
    const [rows] = await con.execute('SELECT jawaban FROM data WHERE pertanyaan = ?', [keyword]);

    if(rows.length > 0) return rows[0].jawaban;
    return false;
}

module.exports = {
    createConnection,
    getReply
}