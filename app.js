const { Client, MessageMedia } = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const http = require('http');
const qrcode = require('qrcode');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const fileUpload = require('express-fileupload'); 
const mongoose = require('mongoose');
const {phoneNumberFormatter} = require('./helper/formatter');
const { response } = require('express');
// const db = require('./helper/db');

mongoose.connect('mongodb://127.0.0.1:27017/dbnumber',{
    useNewUrlParser:true,
    useUnifiedTopology:true
})

// Membuat schema
const Kontak = mongoose.model('number',{
    nohp:{
        type:'string',
        required:true
    },
    pertanyaan:{
        type: 'string',
    },
    jawaban:{
        type:'string'
    }
})



const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(fileUpload({
    debug: true
}));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
}
app.get('/', function (req, res) {
    res.sendFile('./index.html', {root:__dirname});
});

const client = new Client(
    { 
        session: sessionCfg,
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process', // <- this one doesn't works in Windows
                '--disable-gpu'
              ],
        },
        restartOnAuthFail: true, 
    }
);











client.initialize();

//Socket IO
io.on('connection', function(socket){
    socket.emit('message', 'Connecting....');

    // Generate and scan this code with your phone
    client.on('qr', function(qr) {
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, function(err, url){
            console.log(url);
            socket.emit('qr', url);
            socket.emit('message', 'QR Code received, scan please!');

        })
    });

    client.on('ready', () => {
        socket.emit('ready', 'whatsapp is ready');
        socket.emit('message', 'whatsapp is ready');
    });



    client.on('message', async msg => {
        let str = `
        Selamat Datang di Pengadilan, 
        silahkan pilih layanan berikut:
        1. Perkawinan
        2. Waris
        3. Wasiat
        4. Wakaf`;
        console.log(msg.from);
        const duplikat = await Kontak.findOne({nohp: msg.from});

        if(duplikat){
            switch (msg.body) {
                case "1":
                    client.sendMessage(msg.from, `Hal-hal yang diatur dalam atau berdasarkan Undang-undang mengenai perkawinan yang berlaku yang dilakukan menurut syari’ah`);
                  break;
                case "2":
                    client.sendMessage(msg.from, `Penentuan siapa yang menjadi ahli waris, penentuan mengenai harta peninggalan, penentuan bagian masing-masing ahli waris, dan melaksanakan pembagian harta peninggalan tersebut, serta penetapan pengadilan atas permohoonan seseorang tentang penentuan siapa yang menjadi ahli waris, penentuan bagian masing-masing ahli waris`);
                  break;
                case "3":
                  client.sendMessage(msg.from, `Perbuatan seseorang memberikan suatu benda atau manfaat kepada orang lain atau lembaga/badan hukum, yang berlaku setelah yang memberi tersebut meninggal dunia`)
                  break;
                case "4":
                  client.sendMessage(msg.from, `Perbuatan seseorang atau sekelompok orang (wakif) untuk memisahkan dan/atau menyerahkan sebagian harta benda miliknya untuk dimanfaatkan selamanya atau untuk jangka waktu tertentu sesuai dengan kepentingannya guna keperluan ibadah dan/atau kesejahteraan umum menurut syari’ah.`)
                  break;
                default:
                    client.sendMessage(msg.from, `Silahkan pilih 1 sampai 4. Mohon masukkan angka ya`);
                  break;
            }
        }else{
            client.sendMessage(msg.from, str);

            Kontak.insertMany({nohp:msg.from}, (err,hasil)=>{
                if(err){
                    return console.log(err);
                }
            })    

        }

        //save pertanyaan berdasarkan no hp
        Kontak
        .updateOne(
            {
                nohp:msg.from
            },
            {
                $set:{
                    pertanyaan:msg.body
                }
            })
            .then((hasil)=>{
                // kirimkan flash message
                console.log(hasil);
            })
            .catch((err)=>{
                console.log(err)
            })

      
    
    });

    client.on('authenticated', (session) => {
        socket.emit('authenticated', 'whatsapp is authenticated');
        socket.emit('message', 'whatsapp is authenticated');
        console.log('AUTHENTICATED', session);
        sessionCfg=session;
        fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
            if (err) {
                console.error(err);
            }
        });
    });

    client.on('auth_failure', function(session) {
        socket.emit('message', 'Auth failure, restarting...');
    });

    client.on('disconnected', (reason) => {
        socket.emit('message', 'Whatsapp is disconnected!');
        fs.unlinkSync(SESSION_FILE_PATH, function(err) {
            if(err) return console.log(err);
            console.log('Session file deleted!');
        });
        //destroy and reinitialize the client
        client.destroy();
        client.initialize();
      });



});

//function to check is number registered on whatsapp
const checkRegistered = async function(number){
    const isRegistered = await client.isRegisteredUser(number);
    return isRegistered;
}

//send message
app.get('/send-message', async (req,res)=>{
    // const message = req.body.message;
    const message = 'Assalamualaikum';
    const number = ['087755586313','6285624853448@c.us','6285645843352@c.us'];
    console.log(number);
    
   
    for (let i = 0; i < number.length; i++) {
        number[i] = phoneNumberFormatter(number[i]);
        const isRegisteredNumber = await checkRegistered(number[i]);
        if(!isRegisteredNumber){
            res.status(422).json({
                message: 'The number is not registered on WA'
            });
        }
        client.sendMessage(number[i], message)
        // client.sendMessage(number[i], message).then(response =>{
        //     res.status(200).json({
        //         status: true,
        //         response: response
        //       });
        //       console.log(response);
        // }).catch(err =>{
        //     res.status(500).json({
        //         status: false,
        //         response: err,
        //         cinta:'aku cinta kamu'
        //       });
        //       console.log('cinta');
        // });
    }

    res.send('Ngeblash');
   
});

const findGroupByName = async function(name) {
    const group = await client.getChats().then(chats => {
      return chats.find(chat => 
        chat.isGroup && chat.name.toLowerCase() == name.toLowerCase()
      );
    });
    return group;
  }


// Send message to group
// can message by id or name group
app.get('/send-group-message',
// [
//     body('id').custom((value, { req }) => {
//       if (!value && !req.body.name) {
//         throw new Error('Invalid value, you can use `id` or `name`');
//       }
//       return true;
//     }),
//     body('message').notEmpty(),
//   ], async (req, res) => {
//     const errors = validationResult(req).formatWith(({
//       msg
//     }) => {
//       return msg;
//     });
  
//     if (!errors.isEmpty()) {
//       return res.status(422).json({
//         status: false,
//         message: errors.mapped()
//       });
//     }
    async (req, res) => {
    let chatId = false;
    const groupName = 'Basecamp Tawangsari';
    const message = 'Assalamualaikum';
  
    // Find the group by name
    if (!chatId) {
      const group = await findGroupByName(groupName);
      if (!group) {
        return res.status(422).json({
          message: 'No group found with name: ' + groupName
        });
      }
      chatId = group.id._serialized;
    }
  
    client.sendMessage(chatId, message).then(response => {
      res.status(200).json({
        response: response
      });
    }).catch(err => {
      res.status(500).json({
        response: err
      });
    });
  });


//send media
app.post('/send-media', async (req,res)=>{
    const media = MessageMedia.fromFilePath('./halaman_berita.jpg');
    
    // const file = req.files.file;
    // const media = new MessageMedia(file.mimetype, file.data.toString('base64'),file.name );

    // const fileUrl = req.body.file;
    // let mimetype;
    // const attactment = await axios.get(fileUrl, {responseType:'arraybuffer'}).then(response =>{
    //     mimetype = response.headers['content-type'];
    //     return response.data.toString('base64');
    // });

    // const media = new MessageMedia(mimetype, attactment, 'media');
    // const media = MessageMedia.fromUrl(fileUrl);



    const caption = 'Ini adalah gambar hasil screenshoot halaman berita web MA';
    const number = ['087755586313','6285624853448@c.us','6285645843352@c.us'];
    console.log(number);
    
   
    for (let i = 0; i < number.length; i++) {
        number[i] = phoneNumberFormatter(number[i]);
        const isRegisteredNumber = await checkRegistered(number[i]);
        if(!isRegisteredNumber){
            res.status(422).json({
                message: 'The number is not registered on WA'
            });
        }
        client.sendMessage(number[i], media, {caption:caption});
    }

    res.send('Ngeblash');
   
})

server.listen(3000, function(){
    console.log('Listening at : http://localhost:'+3000);
})