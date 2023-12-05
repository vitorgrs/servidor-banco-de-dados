const { Client } = require('pg');
const express = require('express');
const cors = require('cors');
const app = express();
const axios = require('axios');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const MailListener = require('mail-listener2');

// Configuraçôes
app.use(cors());
app.use(express.json()); 
app.use(bodyParser.json());

const client = new Client({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  port: process.env.PGPORT,
});


client.connect().catch((eror) => console.log(eror))


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAILORIGIN,
    pass: process.env.SENHAAPPEMAIL, // Use a senha de aplicativo aqui
  },
});

const mailListener = new MailListener({
  username: process.env.EMAILORIGIN,
  password: process.env.SENHAAPPEMAIL,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
  mailbox: 'INBOX',
  markSeen: true,
  fetchUnreadOnStart: true,
  mailParserOptions: { streamAttachments: true },
});

mailListener.start();

mailListener.on('server:connected', () => {
  console.log('Servidor conectado');
});

mailListener.on('server:disconnected', () => {
  console.log('Servidor desconectado');
});

mailListener.on('mail', (mail, seqno, attributes) => {
  console.log('Novo e-mail recebido:', mail.subject);

  // Extrair o ID da denúncia do corpo do e-mail (ajuste conforme necessário)
  const idDaDenunciaMatch = mail.text.match(/Protocolo: (\d+)/);
  const idDaDenuncia = idDaDenunciaMatch ? parseInt(idDaDenunciaMatch[1]) : null;

  if (idDaDenuncia) {
    // Lógica para lidar com a resposta usando o ID da denúncia
    inserirRespostaNoBanco(idDaDenuncia, mail.text);
  } else {
    console.error('ID da denúncia não encontrado no corpo do e-mail:', mail.text);
  }
});

function extrairCorpoEmail(email) {
  // Divide o e-mail em linhas
  const linhas = email.split('\n');

  // Encontra o índice da linha que indica o início da resposta do e-mail
  let indiceInicioResposta = linhas.findIndex((linha) => (linha.includes('Em ') && linha.includes('Eco Guard')));
  if (indiceInicioResposta === -1) {
    indiceInicioResposta = linhas.findIndex((linha) => linha.includes('Em ') && linha.includes('EcoGuard'));
  // Se não encontrar, tenta outra condição
    if (indiceInicioResposta === -1) {
      indiceInicioResposta = linhas.findIndex((linha) => linha.includes('Em ') && linha.includes('eco.guardslz@gmail.com'));
    }
  }
  // Extrai o corpo do e-mail antes da resposta
  const corpoSemLinha = linhas.slice(0, indiceInicioResposta).join('\n').trim();

  return corpoSemLinha;
}

async function obterEAtualizarStatus(protocolo) {
  try {
    // Consultar o valor atual da coluna status com base no protocolo
    const consultaStatusQuery = 'SELECT status FROM denuncias WHERE protocolo = $1';
    const resultadoConsulta = await client.query(consultaStatusQuery, [protocolo]);

    if (resultadoConsulta.rows.length > 0) {
      const statusAtual = resultadoConsulta.rows[0].status.trim();
       console.log(statusAtual);

      // Atualizar o status com base na lógica fornecida
      let novoStatusAtualizado;
      if (statusAtual === 'Enviada - Aguardando Avaliação') {
        novoStatusAtualizado = 'Em Análise - Denúncia está Sendo Apurada';
      } else if (statusAtual === 'Em Análise - Denúncia está Sendo Apurada') {
        novoStatusAtualizado = 'Em processo de Resolução - com Feedback';
      } else {
        novoStatusAtualizado = 'Em processo de Resolução - Novo Feedback'; 
      }

      // Atualizar o status na tabela denuncias
      const updateStatusQuery = 'UPDATE denuncias SET status = $1 WHERE protocolo = $2';
      await client.query(updateStatusQuery, [novoStatusAtualizado, protocolo]);
    } else {
      console.error('Denúncia não encontrada para o protocolo:', protocolo);
    }
  } catch (err) {
    console.error('Erro ao obter ou atualizar status:', err);
  }
}

async function inserirRespostaNoBanco(respostaID, corpoEmail) {
  try {
    const corpoSemLinha = extrairCorpoEmail(corpoEmail);
    // Verificar se já existe uma denúncia com o ID
    const denunciaExistente = await client.query('SELECT id FROM denuncias WHERE protocolo = $1', [respostaID]);

    if (denunciaExistente.rows.length > 0) {
      const updateQuery = 'UPDATE denuncias SET respostaemail = $1 WHERE protocolo = $2';
      await client.query(updateQuery, [corpoSemLinha, respostaID]);

      // Chamar a função para obter e atualizar o status
      await obterEAtualizarStatus(respostaID);
    }

    console.log(corpoSemLinha);
  } catch (err) {
    console.error('Erro ao inserir resposta no banco de dados:', err);
  }
}



app.post('/inserirResposta', async (req, res) => {
  const { tipodedenuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos, email } = req.body;
  
  const inserircontato = 'INSERT INTO contato(email, contato_celular) VALUES ($1, $2) RETURNING id_contato';
  const valorescontato = [String(email), String(contatos)];

  const inserirenedereco = 'INSERT INTO endereco(logradouro, complemento, cidade, bairro, descricao_do_local) VALUES ($1, $2, $3, $4, $5) RETURNING id_endereco';
  const valoresendereco = [String(logradouro), String(complemento), String(cidade), String(bairro), String(descricaoLocal)];

  

  try {
    const resultadocontato = await client.query(inserircontato, valorescontato);
    const resultadoendereco = await client.query(inserirenedereco, valoresendereco);
    
    const pesquisacrimeambiental = 'SELECT id_crimes_ambiental FROM crimes_ambientais WHERE nome_crimes_ambientais = $1';
    const valorcrimeambiental = String[tipodedenuncia];
    const resultadocrimeambiental = await client.query(pesquisacrimeambiental, valorcrimeambiental);
  
   const inserirdenuncia = 'INSERT INTO denuncias(id_crime_ambiental, id_endereco, id_contato, data_do_ocorrido, relato) VALUES ($1, $2, $3, $4, $5) RETURNING protocolo';
   const valoresdenuncia = [(resultadocrimeambiental.rows[0].id_crimes_ambiental), (resultadoendereco.rows[0].id_endereco), (resultadocontato.rows[0].id_contato), String(data), String(relato)];

      
    const resultadoDenuncia = await client.query(inserirdenuncia, valoresdenuncia);
    const idDaDenuncia = resultadoDenuncia.rows[0].protocolo;
    const contatoInfo = contatos && contatos.trim() !== '' ? contatos : 'Sem informações de contato';
    const emailInfo = email && email.trim() !== '' ? email : 'Sem informações de email';

    const tipoDenunciaResult = await client.query(tipoDenunciaQuery, tipoDenunciaValues);
    const emailDoTipoDenuncia = tipoDenunciaResult.rows[0].email;
    
     // Envio de e-mail
    const mailOptions = {
      from: process.env.EMAILORIGIN,
      to: emailDoTipoDenuncia,
      subject: 'Denúncia realizada através do site ecoguard',
    text: `
        Denúncia realizada:
        Protocolo: ${idDaDenuncia}
        Sobre: ${tipodedenuncia}
        Data do ocorrido: ${data}
        Relato: ${relato}
        Logradouro: ${logradouro}
        Complemento: ${complemento}
        Cidade: ${cidade}
        Bairro: ${bairro}
        Descrição do local: ${descricaoLocal}
        Contato: ${contatoInfo}
        Email: ${emailInfo}
      `,
      html: `
        <p>Denúncia realizada:</p>
        <p>Protocolo: ${idDaDenuncia}</p>
        <p>Sobre: ${tipodedenuncia}</p>
        <p>Data do ocorrido: ${data}</p>
        <p>Relato: ${relato.replace(/\n/g, '<br>')}</p>
        <p>Logradouro: ${logradouro}</p>
        <p>Complemento: ${complemento}</p>
        <p>Cidade: ${cidade}</p>
        <p>Bairro: ${bairro}</p>
        <p>Descrição do local: ${descricaoLocal.replace(/\n/g, '<br>')}</p>
        <p>Contato: ${contatoInfo}</p>
        <p>Email: ${emailInfo}</p>
      `,
      headers: {
        'Message-ID': `<${idDaDenuncia}process.env.EMAILORIGIN>`, // Adicione o idDaDenuncia como um cabeçalho personalizado
      },    
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



  try {
    const result = await client.query('SELECT crimes_ambientais.nome_crimes_ambientais, contato.email, contato.contato_celular, endereco.logradouro, endereco.cidade, endereco.complemento, endereco.bairro, endereco.descricao_do_local, denuncias.status, denuncias.respostaemail, denuncias.relato, denuncias.data_do_ocorrido, denuncias.protocolo FROM denuncias JOIN crimes_ambientais ON denuncias.id_crime_ambiental = crimes_ambientais.id_crime_ambiental JOIN contato ON denuncias.id_contato = contato.id_contato JOIN endereco ON denuncias.id_endereco = endereco.id_endereco WHERE denuncias.protocolo = $1', [protocolo]);
    
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


const instagramToken = process.env.SENHAINSTAGRAM;

// Rota para obter dados do Instagram
app.get('/getInstagramFeed', async (req, res) => {
    try {
        const response = await axios.get(`https://graph.instagram.com/v12.0/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&access_token=${instagramToken}`);
        res.json(response.data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao obter dados do Instagram');
    }
});

app.get('/tiposdenuncia', async (req, res) => {
  try {
   
    const resultado = await client.query('SELECT nome_crimes_ambientais FROM crimes_ambientais');

    // Extrai os resultados da consulta
    const nome_crimes_ambientais = resultado.rows.map(row => row.nome_crimes_ambientais);

    // Responde com os tipos de denúncia em formato JSON
    res.json(nome_crimes_ambientais);
  } catch (error) {
    console.error('Erro na consulta SQL:', error);
    res.status(500).send('Erro interno do servidor');
  }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor está ouvindo na porta ${PORT}`);
});
