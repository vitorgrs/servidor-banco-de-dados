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
    pass: 'xovv ekaf cobv otgt', // Use a senha de aplicativo aqui
  },
});




app.post('/inserirResposta', async (req, res) => {
  const { denuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos } = req.body;

  const query = 'INSERT INTO denuncias(tipo_de_denuncia, data_do_ocorrido, relato, logradouro, complemento, cidade, bairro, descricao_do_local, contato) VALUES (TRIM($1), TRIM($2), TRIM($3), TRIM($4), TRIM($5), TRIM($6), TRIM($7), TRIM($8), TRIM($9)) RETURNING TRIM(id), TRIM(tipo_de_denuncia), TRIM(data_do_ocorrido), TRIM(relato), TRIM(logradouro), TRIM(complemento), TRIM(cidade), TRIM(bairro), TRIM((descricao_do_local), TRIM(contato)';  
  const values = [denuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos];

  try {
    const trimmedValues = values.map(value => (typeof value === 'string' ? value.trim() : value));
    const result = await client.query(query, trimmedValues);
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

    console.log('Dados antes de enviar o e-mail:', {
      idDaDenuncia,
      tipodenuncia,
      data,
      relato,
      logradouro,
      complemento,
      cidade,
      bairro,
      descricao,
      contato,
    });

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
