# BATORA — Sistema da Balança do Barreiro

Sistema administrativo local que substitui as planilhas **BALANCA IRC BRASIL.xlsx** e
**TICKET TERCEIROS 2022.xlsx**. Roda 100% no seu computador, sem internet.

## Como iniciar

```bash
npm run dev
```

Depois abra **http://localhost:3000** no navegador (funciona também pelo celular na mesma
rede Wi-Fi, usando o endereço "Network" mostrado no terminal).

## Quem entra com qual senha

A tela de login é a mesma para todos — o que muda é a senha digitada:

- **Sua senha (dono):** `batora2026` (troque em **Ajustes**) → acesso total: painel, caixa,
  gastos, clientes, conveniadas, empresas, ajustes, e poder de criar/editar/excluir tudo.
- **Senha única de uma empresa conveniada** (veja em **Empresas**) → acesso restrito:
  a empresa enxerga **somente as pesagens e tickets dela**, pode **pedir ticket só para ela
  mesma** (sem digitar senha de novo) e **não consegue alterar nada** — sem editar, sem
  excluir, sem mudar forma de pagamento, sem ver clientes, caixa ou valores de outros.
- **Botão "Sou cliente particular (pagamento à vista)"** → sem senha: o cliente avulso
  preenche nome, placa, tara e material e envia a solicitação. **Logo depois** aparece o
  pagamento na tela dele (QR Code PIX ou link de cartão do Mercado Pago). Você vê o pedido em
  **Aguardando peso** com o status **"EM PROCESSO — aguardando pagamento"** e o campo do bruto
  **só libera quando o Mercado Pago aprovar** (badge verde "PAGO — Mercado Pago às hh:mm").
  Sem o token do MP, o pedido chega marcado **"cobrar na balança"** e pode ser emitido direto.
  O particular só enxerga o próprio pedido — nenhuma outra tela.

## Peso bruto: só a balança lança

Quando a **empresa** pede um ticket, ela preenche cliente, placa, tara e material — **sem o
peso bruto**. O pedido vira uma solicitação:

1. O **sino no topo** do seu acesso de administrador toca (som + selo vermelho + notificação
   do navegador, se permitida) na hora.
2. Você abre **Aguardando peso** (ou toca no sino), lê o **bruto no visor da balança**, digita
   e emite — o líquido é conferido na tela e o sistema bloqueia bruto menor que a tara.
3. O ticket sai com data e hora de agora, entra no controle mensal, e **abre sozinho na tela
   da empresa** para imprimir ou baixar o PDF. Também dá para recusar a solicitação.

Dica: na primeira vez, toque no sino para o navegador pedir permissão de notificação.

## Módulos

| Módulo | O que faz |
|---|---|
| **Painel** | Balanço mensal: pesagens à vista (dinheiro/PIX), conveniadas, gastos, resultado e gráfico de 12 meses |
| **Pesagens** | Registro com nº sequencial que **reinicia em 01 todo mês**, filtros por mês/empresa/forma e busca por placa |
| **Novo ticket** | Gera o ticket (tara, bruto, líquido automático) e registra a pesagem no controle mensal sozinho |
| **Modo WhatsApp** | Formulário rápido na ordem Nome → Placa → Tara → Material → Bruto, baixa o PDF na hora |
| **Tickets emitidos** | Histórico, reimpressão (2 vias A4) e download de PDF |
| **Clientes** | Cadastro com telefone/observações, busca por nome e histórico completo (tickets, pesagens, placas, totais) — clientes novos entram sozinhos ao gerar ticket |
| **Caixa diário** | Início do dia puxado do dia anterior, entradas/PIX/retiradas com totais automáticos |
| **Gastos** | Controle de despesas (almoço, toner, folhas…) |
| **Conveniadas** | Pesagens do mês × valor de cada empresa = total a cobrar, com status PAGO / EM ABERTO |
| **Empresas** | Cadastro das conveniadas com valor por pesagem individual (padrão R$ 30,00) e **senha única de emissão** de cada uma |
| **Ajustes** | Valor da pesagem avulsa, chave PIX manual, **Access Token do Mercado Pago** e troca de senha |

## Regras de emissão do ticket

- **Conveniada (MENSAL):** o ticket só sai digitando a **senha única da empresa**
  (veja/edite as senhas na tela **Empresas** — deixe em branco e salve para gerar outra).
- **Particular com Mercado Pago configurado:** PIX gera **QR Code na tela** e cartão gera
  **link de pagamento**; o ticket é emitido **sozinho** assim que o pagamento for aprovado
  (verificação automática a cada 4 segundos). Cobranças pendentes ficam listadas em
  **Tickets emitidos** para reabrir a qualquer momento.
- **Particular em DINHEIRO:** emite na hora.
- **Sem o token do Mercado Pago:** PIX volta ao modo manual (mostra a chave para copiar) e
  cartão fica indisponível.

### Como ligar o Mercado Pago

1. Entre em **mercadopago.com.br** → *Seu negócio* → *Configurações* → *Credenciais*.
2. Copie o **Access Token de produção** (começa com `APP_USR`).
3. Cole em **Ajustes → Mercado Pago** e salve. Pronto — as cobranças caem direto na sua conta.

## Dados

- O banco fica em `data/batora.db` (SQLite). **Faça backup deste arquivo.**
- O histórico das duas planilhas já foi importado: 2.790 pesagens (ago/2024 a abr/2025),
  292 dias de caixa, 91 gastos, cobranças de conveniadas e 20 tickets.
- Para reimportar do zero: apague `data/batora.db` e recarregue a página
  (o seed em `data/seed/seed.json` é aplicado automaticamente).

## Logo do ticket

Substitua `public/logo.png` pela logo oficial (imagem quadrada). Ela aparece no canto
superior esquerdo do ticket impresso e do PDF.

## Usando no celular / iPhone

- Abra o endereço "Network" do terminal no navegador do celular (mesma rede Wi-Fi).
- Para virar um "aplicativo": no Safari toque em **Compartilhar → Adicionar à Tela de Início**
  (no Android: menu do Chrome → **Adicionar à tela inicial**). O BATORA abre em tela cheia,
  com ícone próprio e sem zoom acidental.
- O menu de baixo tem os atalhos do dia a dia; o botão ☰ no topo abre todas as telas.

## Impressão

O botão **Imprimir** gera as **2 vias idênticas na mesma folha A4** com linha de corte.
O botão **Baixar PDF** salva o arquivo para enviar pelo WhatsApp.
