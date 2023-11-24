const { Client } = require('pg');
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
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
    pass: 'ecoguard0000',
  },
  secure: true,
});



app.post('/inserirResposta', async (req, res) => {
  const { denuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos } = req.body;

  const query = 'INSERT INTO denuncias(tipo_de_denuncia, data_do_ocorrido, relato, logradouro, complemento, cidade, bairro, descricao_do_local, contato) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id';  
  const values = [denuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos];

  try {
    const result = await client.query(query, values);
    const idDaDenuncia = result.rows[0].id;
    const tipodenuncia = result.rows[0].tipo_de_denuncia;

     // Envio de e-mail
    const mailOptions = {
      from: 'eco.guardslz@gmail.com',
      to: 'gamervitor28@gmail.com',
      subject: 'Nova resposta de denúncia',
      text: `Nova resposta de denúncia. ID da denúncia: ${idDaDenuncia}, sobre: ${tipodenuncia}`,
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


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor está ouvindo na porta ${PORT}`);
});
