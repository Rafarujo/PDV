let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
let carrinho = [];
let vendas = JSON.parse(localStorage.getItem("vendas")) || [];
let vendedores = JSON.parse(localStorage.getItem("vendedores")) || [];
let selectedPaymentMethods = [];
let currentUser = null;

// Usuário ADM padrão
if (!vendedores.some((v) => v.nome === "admin")) {
  vendedores.push({
    nome: "admin",
    senha: "123456",
    isAdmin: true,
    ativo: true,
  });
  localStorage.setItem("vendedores", JSON.stringify(vendedores));
}

function mudarAba(abaId) {
  if (abaId === "vendedores" && (!currentUser || !currentUser.isAdmin)) {
    alert("Acesso negado! Apenas administradores podem acessar esta aba.");
    return;
  }

  document
    .querySelectorAll(".conteudo-aba")
    .forEach((aba) => aba.classList.remove("ativa"));
  document
    .querySelectorAll(".aba")
    .forEach((aba) => aba.classList.remove("ativa"));
  document.getElementById(abaId).classList.add("ativa");
  document
    .querySelector(`[onclick="mudarAba('${abaId}')"]`)
    .classList.add("ativa");

  if (abaId === "estoque") {
    atualizarListaEstoque();
    preencherSelectAjuste();
  } else if (abaId === "vendedores") {
    atualizarListaVendedores();
  } else if (abaId === "controle") {
    gerarRelatorioVendas();
    gerarGraficoDesempenho();
  }
}

function acessarAbaVendedores() {
  const nome = prompt("Digite o nome do administrador:");
  const senha = prompt("Digite a senha do administrador:");
  const admin = vendedores.find(
    (v) => v.nome === nome && v.senha === senha && v.isAdmin
  );

  if (admin) {
    currentUser = admin;
    mudarAba("vendedores");
  } else {
    alert("Acesso negado! Apenas administradores podem acessar esta aba.");
  }
}

function salvarDados() {
  localStorage.setItem("produtos", JSON.stringify(produtos));
  localStorage.setItem("vendas", JSON.stringify(vendas));
  localStorage.setItem("vendedores", JSON.stringify(vendedores));
}

// Funções de Vendas
function filterProducts() {
  const searchTerm = document
    .getElementById("search-product")
    .value.toLowerCase();
  const filtered = produtos.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm)
  );
  renderProducts(filtered);
}

function renderProducts(productsArray) {
  const container = document.getElementById("produtos");
  container.innerHTML = "";

  productsArray.forEach((produto) => {
    const div = document.createElement("div");
    div.className = "produto";
    div.innerHTML = `
            <h3>${produto.nome}</h3>
            <p>R$ ${produto.preco.toFixed(2)}</p>
            ${
              produto.maxDesconto
                ? `<p>Desc. Máx: ${produto.maxDesconto}%</p>`
                : ""
            }
            <p class="${produto.estoque <= 5 ? "estoque-baixo" : ""}">
                Estoque: ${produto.estoque}
                ${
                  produto.estoque <= 5
                    ? '<span class="alerta-estoque">⚠️ Estoque Baixo!</span>'
                    : ""
                }
            </p>
            <button ${
              produto.estoque <= 0 ? "disabled" : ""
            } onclick="adicionarAoCarrinho(${produto.id})">
                ${produto.estoque <= 0 ? "Esgotado" : "Adicionar"}
            </button>
        `;
    container.appendChild(div);
  });
}

function adicionarAoCarrinho(id) {
  const produto = produtos.find((p) => p.id === id);
  if (produto.estoque <= 0) return;

  const itemExistente = carrinho.find((item) => item.id === id);

  if (itemExistente) {
    if (itemExistente.quantidade >= produto.estoque) {
      alert("Estoque insuficiente!");
      return;
    }
    itemExistente.quantidade++;
  } else {
    carrinho.push({
      ...produto,
      quantidade: 1,
    });
  }

  atualizarCarrinho();
}

function atualizarCarrinho() {
  const container = document.getElementById("itens-carrinho");
  const totalElement = document.getElementById("total");

  container.innerHTML = "";

  carrinho.forEach((item) => {
    const div = document.createElement("div");
    div.className = "item-carrinho";
    div.innerHTML = `
            <div>
                ${item.nome} 
                <input type="number" value="${item.quantidade}" min="1" max="${
      item.estoque
    }" onchange="updateQuantity(${item.id}, this.value)">
            </div>
            <div>
                ${item.quantidade}x R$ ${item.preco.toFixed(2)}
                ${
                  item.desconto
                    ? `<br><span style="color:red;">-${item.desconto}%</span>`
                    : ""
                }
            </div>
            <button onclick="removerItem(${item.id})">X</button>
        `;
    container.appendChild(div);
  });

  totalElement.textContent = getTotal().toFixed(2);
  if (selectedPaymentMethods.includes("dinheiro")) {
    const valorRecebido =
      parseFloat(document.getElementById("valor-recebido").value) || 0;
    document.getElementById("troco").textContent = (
      valorRecebido - getTotal()
    ).toFixed(2);
  }
}

function getTotal() {
  return carrinho.reduce((acc, item) => {
    const desconto = item.desconto || 0;
    const precoComDesconto = item.preco * (1 - desconto / 100);
    return acc + precoComDesconto * item.quantidade;
  }, 0);
}

function updateQuantity(id, newQuantity) {
  const item = carrinho.find((item) => item.id === id);
  const produto = produtos.find((p) => p.id === id);

  if (newQuantity > produto.estoque) {
    alert("Estoque insuficiente!");
    item.quantidade = produto.estoque;
    atualizarCarrinho();
    return;
  }

  item.quantidade = parseInt(newQuantity);
  atualizarCarrinho();
}

function removerItem(id) {
  carrinho = carrinho.filter((item) => item.id !== id);
  atualizarCarrinho();
}

// Funções de Pagamento
function selectPaymentMethod(method) {
  const element = event.target;
  if (selectedPaymentMethods.includes(method)) {
    selectedPaymentMethods = selectedPaymentMethods.filter((m) => m !== method);
    element.classList.remove("selected");
  } else {
    if (selectedPaymentMethods.length < 2) {
      selectedPaymentMethods.push(method);
      element.classList.add("selected");
    }
  }
  updatePaymentUI();
}

function updatePaymentUI() {
  const mixedPaymentDiv = document.getElementById("mixed-payment");
  const trocoSection = document.getElementById("troco-section");

  if (selectedPaymentMethods.length > 1) {
    mixedPaymentDiv.style.display = "block";
    trocoSection.style.display = "none";
    renderPaymentSplit();
  } else {
    mixedPaymentDiv.style.display = "none";
    trocoSection.style.display = selectedPaymentMethods.includes("dinheiro")
      ? "block"
      : "none";
  }
}

function renderPaymentSplit() {
  const container = document.getElementById("payment-split");
  container.innerHTML = "";

  selectedPaymentMethods.forEach((method, index) => {
    const div = document.createElement("div");
    div.innerHTML = `
            ${method.toUpperCase()}: 
            <input type="number" id="valor-${method}" placeholder="Valor ${method}" oninput="calculateSplitPayment()">
        `;
    container.appendChild(div);
  });
}

function calculateSplitPayment() {
  const total = getTotal();
  let sum = 0;

  selectedPaymentMethods.forEach((method) => {
    const value =
      parseFloat(document.getElementById(`valor-${method}`).value) || 0;
    sum += value;
  });

  if (sum > total) {
    document.getElementById("troco").textContent = (sum - total).toFixed(2);
  }
}

function aplicarDescontoGeral() {
  const desconto = parseFloat(document.getElementById("desconto-geral").value);
  if (desconto > 0) {
    carrinho.forEach((item) => {
      const produto = produtos.find((p) => p.id === item.id);
      const maxDesconto = produto.maxDesconto || 0;
      const descontoAplicado = Math.min(desconto, maxDesconto);
      item.desconto = descontoAplicado;
    });
    atualizarCarrinho();
  }
}

function removerDescontoGeral() {
  carrinho.forEach((item) => {
    item.desconto = 0;
  });
  document.getElementById("desconto-geral").value = "";
  atualizarCarrinho();
}

function finalizarVenda() {
  if (carrinho.length === 0) {
    alert("Carrinho vazio!");
    return;
  }

  if (selectedPaymentMethods.length === 0) {
    alert("Selecione uma forma de pagamento!");
    return;
  }

  if (selectedPaymentMethods.includes("dinheiro")) {
    const valorRecebido =
      parseFloat(document.getElementById("valor-recebido").value) || 0;
    if (valorRecebido < getTotal()) {
      alert("Valor recebido insuficiente!");
      return;
    }
  }

  const nomeVendedor = prompt("Digite o nome do vendedor:");
  const senhaVendedor = prompt("Digite a senha do vendedor:");
  const vendedor = vendedores.find(
    (v) => v.nome === nomeVendedor && v.senha === senhaVendedor && v.ativo
  );

  if (!vendedor) {
    alert("Vendedor não encontrado ou senha incorreta!");
    return;
  }

  // Atualizar estoque
  carrinho.forEach((item) => {
    const produto = produtos.find((p) => p.id === item.id);
    produto.estoque -= item.quantidade;
  });

  // Registrar venda
  vendas.push({
    data: new Date().toISOString(),
    itens: carrinho,
    total: getTotal(),
    pagamento: selectedPaymentMethods,
    descontoAplicado: document.getElementById("desconto-geral").value || 0,
    vendedor: nomeVendedor,
  });

  salvarDados();
  init();
  carrinho = [];
  selectedPaymentMethods = [];
  document
    .querySelectorAll(".payment-method")
    .forEach((m) => m.classList.remove("selected"));
  document.getElementById("desconto-geral").value = "";
  atualizarCarrinho();
  alert("Venda finalizada com sucesso!");
}

// Funções de Estoque
function cadastrarProduto() {
  const novoProduto = {
    id: produtos.length + 1,
    nome: document.getElementById("nome-produto").value,
    preco: parseFloat(document.getElementById("preco-produto").value),
    estoque: parseInt(document.getElementById("estoque-inicial").value),
    maxDesconto: parseInt(document.getElementById("max-desconto").value) || 0,
  };

  produtos.push(novoProduto);
  salvarDados();
  init();
  atualizarListaEstoque();
  preencherSelectAjuste();

  // Limpar campos
  document.getElementById("nome-produto").value = "";
  document.getElementById("preco-produto").value = "";
  document.getElementById("estoque-inicial").value = "";
  document.getElementById("max-desconto").value = "";
}

function preencherSelectAjuste() {
  const select = document.getElementById("produto-ajuste");
  select.innerHTML = '<option value="">Selecione um produto</option>';

  produtos.forEach((produto) => {
    const option = document.createElement("option");
    option.value = produto.id;
    option.textContent = `${produto.nome} (Estoque: ${produto.estoque})`;
    select.appendChild(option);
  });
}

function ajustarEstoque() {
  const produtoId = document.getElementById("produto-ajuste").value;
  const quantidade = parseInt(
    document.getElementById("quantidade-ajuste").value
  );

  if (!produtoId || isNaN(quantidade)) {
    alert("Selecione um produto e insira uma quantidade válida!");
    return;
  }

  const produto = produtos.find((p) => p.id == produtoId);
  produto.estoque += quantidade;

  if (produto.estoque < 0) {
    alert("O estoque não pode ser negativo!");
    produto.estoque = 0;
  }

  salvarDados();
  atualizarListaEstoque();
  preencherSelectAjuste();
  document.getElementById("quantidade-ajuste").value = "";
  alert("Estoque ajustado com sucesso!");
}

function atualizarListaEstoque() {
  const lista = document.getElementById("lista-estoque");
  lista.innerHTML = "";

  produtos.forEach((produto) => {
    const div = document.createElement("div");
    div.className = "item-carrinho";
    div.innerHTML = `
            <div>
                ${produto.nome}
                ${
                  produto.estoque <= 5
                    ? '<span class="alerta-estoque">⚠️ Estoque Baixo!</span>'
                    : ""
                }
            </div>
            <div class="${produto.estoque <= 5 ? "estoque-baixo" : ""}">
                Estoque: ${produto.estoque}
            </div>
            <div>Preço: R$ ${produto.preco.toFixed(2)}</div>
            <div>Desc. Máx: ${produto.maxDesconto}%</div>
        `;
    lista.appendChild(div);
  });
}

// Funções de Vendedores
function cadastrarVendedor() {
  const nome = document.getElementById("nome-vendedor").value;
  const senha = document.getElementById("senha-vendedor").value;

  if (!nome || !senha) {
    alert("Preencha todos os campos!");
    return;
  }

  if (vendedores.some((v) => v.nome === nome)) {
    alert("Vendedor já cadastrado!");
    return;
  }

  vendedores.push({
    nome,
    senha,
    isAdmin: false,
    ativo: true,
  });

  salvarDados();
  atualizarListaVendedores();
  document.getElementById("nome-vendedor").value = "";
  document.getElementById("senha-vendedor").value = "";
  alert("Vendedor cadastrado com sucesso!");
}

function atualizarListaVendedores() {
  const lista = document.getElementById("lista-vendedores");
  lista.innerHTML = "";

  vendedores.forEach((vendedor) => {
    const div = document.createElement("div");
    div.className = "vendedor-item";
    div.innerHTML = `
            <div>
                ${vendedor.nome} 
                ${vendedor.isAdmin ? "(Admin)" : ""}
                ${!vendedor.ativo ? "(Inativo)" : ""}
            </div>
            <div class="vendedor-actions">
                <button onclick="editarVendedor('${
                  vendedor.nome
                }')">Editar</button>
                <button onclick="alternarStatusVendedor('${vendedor.nome}')">
                    ${vendedor.ativo ? "Desativar" : "Ativar"}
                </button>
                ${
                  !vendedor.isAdmin
                    ? `<button onclick="excluirVendedor('${vendedor.nome}')">Excluir</button>`
                    : ""
                }
            </div>
        `;
    lista.appendChild(div);
  });
}

function editarVendedor(nome) {
  const vendedor = vendedores.find((v) => v.nome === nome);
  const novaSenha = prompt("Digite a nova senha:");
  if (novaSenha) {
    vendedor.senha = novaSenha;
    salvarDados();
    atualizarListaVendedores();
    alert("Senha alterada com sucesso!");
  }
}

function alternarStatusVendedor(nome) {
  const vendedor = vendedores.find((v) => v.nome === nome);
  vendedor.ativo = !vendedor.ativo;
  salvarDados();
  atualizarListaVendedores();
  alert(`Vendedor ${vendedor.ativo ? "ativado" : "desativado"} com sucesso!`);
}

function excluirVendedor(nome) {
  if (confirm("Tem certeza que deseja excluir este vendedor?")) {
    vendedores = vendedores.filter((v) => v.nome !== nome);
    salvarDados();
    atualizarListaVendedores();
    alert("Vendedor excluído com sucesso!");
  }
}

// Funções de Controle
function gerarRelatorioVendas() {
  const relatorio = document.getElementById("relatorio");
  const filtroData = document.getElementById("filtro-data").value;
  const filtroVendedor = document
    .getElementById("filtro-vendedor")
    .value.toLowerCase();
  const filtroProduto = document
    .getElementById("filtro-produto")
    .value.toLowerCase();
  const filtroPagamento = document.getElementById("filtro-pagamento").value;

  let html = "<h4>Relatório de Vendas</h4>";

  vendas
    .filter((venda) => {
      const dataVenda = venda.data.split("T")[0];
      const vendedor = venda.vendedor.toLowerCase();
      const produtos = venda.itens
        .map((item) => item.nome.toLowerCase())
        .join(", ");
      const pagamento = venda.pagamento.join(", ");

      return (
        (!filtroData || dataVenda === filtroData) &&
        (!filtroVendedor || vendedor.includes(filtroVendedor)) &&
        (!filtroProduto || produtos.includes(filtroProduto)) &&
        (!filtroPagamento || pagamento.includes(filtroPagamento))
      );
    })
    .forEach((venda) => {
      html += `
                <div class="item-carrinho">
                    <div>Data: ${new Date(venda.data).toLocaleString()}</div>
                    <div>Vendedor: ${venda.vendedor}</div>
                    <div>Produtos: ${venda.itens
                      .map((item) => `${item.nome} (${item.quantidade}x)`)
                      .join(", ")}</div>
                    <div>Pagamento: ${venda.pagamento.join(", ")}</div>
                    <div>Total: R$ ${venda.total.toFixed(2)}</div>
                    <div>Desconto: ${venda.descontoAplicado}%</div>
                </div>
            `;
    });

  relatorio.innerHTML = html;
}

function exportarRelatorioCSV() {
  const filtroData = document.getElementById("filtro-data").value;
  const filtroVendedor = document
    .getElementById("filtro-vendedor")
    .value.toLowerCase();
  const filtroProduto = document
    .getElementById("filtro-produto")
    .value.toLowerCase();
  const filtroPagamento = document.getElementById("filtro-pagamento").value;

  const vendasFiltradas = vendas.filter((venda) => {
    const dataVenda = venda.data.split("T")[0];
    const vendedor = venda.vendedor.toLowerCase();
    const produtos = venda.itens
      .map((item) => item.nome.toLowerCase())
      .join(", ");
    const pagamento = venda.pagamento.join(", ");

    return (
      (!filtroData || dataVenda === filtroData) &&
      (!filtroVendedor || vendedor.includes(filtroVendedor)) &&
      (!filtroProduto || produtos.includes(filtroProduto)) &&
      (!filtroPagamento || pagamento.includes(filtroPagamento))
    );
  });

  let csv =
    "Data,Vendedor,Produtos,Quantidade,Preço Unitário,Desconto,Forma de Pagamento,Total\n";

  vendasFiltradas.forEach((venda) => {
    venda.itens.forEach((item) => {
      csv += `${new Date(venda.data).toLocaleString()},${venda.vendedor},${
        item.nome
      },${item.quantidade},${item.preco.toFixed(2)},${
        venda.descontoAplicado
      }%,${venda.pagamento.join(", ")},${(
        item.preco *
        item.quantidade *
        (1 - venda.descontoAaplicado / 100)
      ).toFixed(2)}\n`;
    });
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "relatorio-vendas.csv";
  a.click();
}

function gerarGraficoDesempenho() {
  const ctx = document.getElementById("graficoDesempenho").getContext("2d");
  const vendedoresMap = {};

  vendas.forEach((venda) => {
    if (!vendedoresMap[venda.vendedor]) {
      vendedoresMap[venda.vendedor] = 0;
    }
    vendedoresMap[venda.vendedor] += venda.total;
  });

  const labels = Object.keys(vendedoresMap);
  const data = Object.values(vendedoresMap);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Total de Vendas por Vendedor",
          data: data,
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          borderColor: "rgba(75, 192, 192, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

// Inicialização
function init() {
  renderProducts(produtos);
  atualizarCarrinho();
}

window.onload = () => {
  init();
  atualizarListaEstoque();
  preencherSelectAjuste();
  atualizarListaVendedores();
};
