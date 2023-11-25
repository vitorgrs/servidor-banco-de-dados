const { Client } = require('pg');
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const http = require('http');
const socketIO = require('socket.io');

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: 'https://eco-guard.vercel.app/scr/feedback.html',
    methods: ['GET', 'POST'],
  },
});


io.on('connection', (socket) => {
  console.log('Cliente conectado');
  // Lógica adicional do Socket.IO
});

// Configuraçôes
app.use(cors());
app.use(express.json()); 
app.use(bodyParser.json());

const client = new Client({
    user: 'postgres',
    host: 'monorail.proxy.rlwy.net',
    database: 'railway',
    password: 'af--BC64gE-1A3gECdGEFgC5d6fgDfdE',
    port: 59355,
});

client.connect().catch((eror) => console.log(eror))


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'eco.guardslz@gmail.com',
    pass: 'xovv ekaf cobv otgt', // Use a senha de aplicativo aqui
  },
    replyTo: 'https://eco-guard.vercel.app/respostaEmail',
});


function extractDenunciaIdentifier(respostaDoEmail) {

  const idDaDenunciaHeader = respostaDoEmail.headers['X-Id-Denuncia']   || respostaDoEmail.headers['X-Id-Denuncia'];
  
  if (idDaDenunciaHeader) {
    return idDaDenunciaHeader;
  } else {
    // Lidar com a situação em que o cabeçalho personalizado não está presente no e-mail
    console.error('Cabeçalho personalizado "X-Id-Denuncia" não encontrado no e-mail.');
    return null; // Ou retorne um valor padrão ou lide com isso de acordo com sua lógica
  }
}


app.post('/inserirResposta', async (req, res) => {
  const { denuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos } = req.body;

  const query = 'INSERT INTO denuncias(tipo_de_denuncia, data_do_ocorrido, relato, logradouro, complemento, cidade, bairro, descricao_do_local, contato) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, tipo_de_denuncia, data_do_ocorrido, relato, logradouro, complemento, cidade, bairro, descricao_do_local, contato';
  const values = [String(denuncia), String(data), String(relato), String(logradouro), String(complemento), String(cidade), String(bairro), String(descricaoLocal), String(contatos)];


  try {
    const result = await client.query(query, values);
    const idDaDenuncia = result.rows[0].id;
    const tipodenuncia = result.rows[0].tipo_de_denuncia;
    const data= result.rows[0].data_do_ocorrido;
    const ralato = result.rows[0].relato;
    const logradouro =result.rows[0].logradouro;
    const complemento= result.rows[0].complemento;
    const cidade = result.rows[0].cidade;
    const bairro = result.rows[0].bairro;
    const descricao = result.rows[0].descricao_do_local;
    const contato = result.rows[0].contato;

    
     // Envio de e-mail
    const mailOptions = {
      from: 'eco.guardslz@gmail.com',
      to: 'gamervitor28@gmail.com',
      subject: 'Denúncia realizada através do site ecoguard',
    text: `
        Denúncia realizada:
        Sobre: ${tipodenuncia}
        Data do ocorrido: ${data}
        Relato: ${relato}
        Logradouro: ${logradouro}
        Complemento: ${complemento}
        Cidade: ${cidade}
        Bairro: ${bairro}
        Descrição do local: ${descricao}
        Contato: ${contato}
      `,
      html: `
        <p>Denúncia realizada:</p>
        <p>Sobre: ${tipodenuncia}</p>
        <p>Data do ocorrido: ${data}</p>
        <p>Relato: ${relato.replace(/\n/g, '<br>')}</p>
        <p>Logradouro: ${logradouro}</p>
        <p>Complemento: ${complemento}</p>
        <p>Cidade: ${cidade}</p>
        <p>Bairro: ${bairro}</p>
        <p>Descrição do local: ${descricao.replace(/\n/g, '<br>')}</p>
        <p>Contato: ${contato}</p>
      `,
      headers: {
        'X-Id-Denuncia': idDaDenuncia // Adicione o idDaDenuncia como um cabeçalho personalizado
      }    
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Erro ao enviar e-mail:', error);
        res.status(500).send('Erro ao enviar e-mail');
      } else {
        console.log('E-mail enviado:', info.response);
        res.status(200).json({ id: idDaDenuncia });
      }
      
    });



    console.log('Resposta inserida com sucesso. ID da denúncia:', idDaDenuncia);
    res.status(200).json({ id: idDaDenuncia });

  } catch (error) {
    console.error('Erro ao inserir denuncia:', error);
    res.status(500).send('Erro ao inserir resposta');
  }
});

app.get('/obterDenuncia/:protocolo', async (req, res) => {
  const protocolo = req.params.protocolo;
  /*
  if (!protocolo) {
    res.status(400).send('Protocolo não fornecido');
    return;
  }*/

  try {
    const result = await client.query('SELECT * FROM denuncias WHERE id = $1', [protocolo]);

    if (result.rows.length > 0) {
      const denuncia = result.rows[0];
      res.status(200).json(denuncia);
    } else {
      res.status(404).send('Denúncia não encontrada');
    }
  } catch (error) {
    console.error('Erro ao obter denúncia do banco de dados:', error);
    res.status(500).send('Erro interno do servidor');
  }
});
app.post('/respostaEmail', (req, res) => {
  // Extrair informações da resposta do e-mail
  const respostaDoEmail = req.body.text; // Ajuste conforme a estrutura real do e-mail

  // Extraia o identificador da denúncia da resposta do e-mail
  const identificadorDenuncia = extractDenunciaIdentifier(respostaDoEmail); // Implemente a lógica para extrair o identificador

  // Envie a resposta diretamente para a página HTML
  io.emit('respostaDenuncia', { identificadorDenuncia, respostaDoEmail });

  res.status(200).send('Resposta de e-mail processada com sucesso.');
});
/*
app.get('/api/feedback', async (req, res) => {
  const identificador = req.query.protocolo;

  // Lógica para buscar o feedback no banco de dados usando o código único
  // ...

  // Exemplo de resposta
  res.json({ feedback: 'Feedback obtido do banco de dados' });
});*/

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor está ouvindo na porta ${PORT}`);
});
