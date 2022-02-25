const { Client } = require('pg');

const client = new Client({
    connectionString:'',
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect();


//read session
const readSession = async () =>{
    try {
        const res = await client.query('SELECT * FROM table ORDER BY created_at DESC LIMIT 1');
        if(res.rows.length) return res.rows[0].session;
        return '';
    } catch (error) {
        throw error;
    }
}

//save session to database postgre
const saveSession = (session) =>{
    client.query('INSERT INTO table (session) VALUES($1)', [session], (err,result)=>{
        if(err){
            console.error('Failed to save session!', err);
        }else{
            console.log('Session Saved!');
        }
    });
}


//delete session
const deleteSession = ()=>{
    client.query('DELETE FROM table', (err,result)=>{
        if(err){
            console.error('Failed to delete session!', err);
        }else{
            console.log('Session deleted!');
        }
    })
}

module.exports = {
    readSession,
    saveSession,
    deleteSession
}


