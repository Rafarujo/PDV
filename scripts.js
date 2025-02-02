let produtos = JSON.parse(localStorage.getItem('produtos')) || [];
let carrinho = [];
let vendas = JSON.parse(localStorage.getItem('vendas')) || [];
let vendedores = JSON.parse(localStorage.getItem('vendedores')) || [];
let selectedPaymentMethods = [];
let currentUser = null;
let retiradas = JSON.parse(localStorage.getItem('retiradas')) || [];

// Usuário ADM padrão
if (!vendedores.some(v => v.nome === 'admin')) {
    vendedores.push({
        nome: 'admin',
        senha: '123456',
        isAdmin: true,
        ativo: true
    });
    localStorage.setItem('vendedores', JSON.stringify(vendedores));
}

// Adicione estas funções no início do arquivo, após as declarações de variáveis
function showAuthModal(title, onConfirm) {
    const modalHTML = `
        <div class="auth-modal-overlay" id="authModal">
            <div class="auth-modal">
                <h3>${title}</h3>
                <form class="auth-form" id="authForm">
                    <div class="auth-input-group">
                        <input type="text" id="auth-nome" placeholder="Nome do vendedor" required>
                    </div>
                    <div class="auth-input-group">
                        <input type="password" id="auth-senha" placeholder="Senha" required>
                    </div>
                    <div class="auth-error" id="auth-error"></div>
                    <div class="auth-buttons">
                        <button type="button" class="auth-cancel-btn" onclick="closeAuthModal()">Cancelar</button>
                        <button type="submit" class="auth-confirm-btn">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Remover modal anterior se existir
    const oldModal = document.getElementById('authModal');
    if (oldModal) oldModal.remove();

    // Adicionar novo modal
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Mostrar modal
    const modal = document.getElementById('authModal');
    modal.style.display = 'flex';
    
    // Adicionar event listener para o formulário
    const form = document.getElementById('authForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleAuthSubmit();
    });
    
    // Focar no primeiro input
    document.getElementById('auth-nome').focus();

    // Armazenar callback
    window.currentAuthCallback = onConfirm;
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.remove();
    }
}

function handleAuthSubmit() {
    const nome = document.getElementById('auth-nome').value;
    const senha = document.getElementById('auth-senha').value;
    const errorElement = document.getElementById('auth-error');

    if (!nome || !senha) {
        errorElement.textContent = 'Por favor, preencha todos os campos';
        return;
    }

    const vendedor = vendedores.find(v => v.nome === nome && v.senha === senha && v.ativo);
    
    if (vendedor) {
        closeAuthModal();
        window.currentAuthCallback(vendedor);
    } else {
        errorElement.textContent = 'Usuário não encontrado ou senha incorreta';
        document.getElementById('auth-senha').value = '';
    }
}

// Função de Login
function fazerLogin() {
    const nome = document.getElementById('login-nome').value;
    const senha = document.getElementById('login-senha').value;
    const errorElement = document.getElementById('login-error');
    
    if (!nome || !senha) {
        errorElement.textContent = 'Por favor, preencha todos os campos';
        return;
    }

    const vendedor = vendedores.find(v => v.nome === nome && v.senha === senha && v.ativo);

    if (vendedor) {
        errorElement.textContent = ''; // Limpa mensagem de erro
        currentUser = vendedor;
        document.getElementById('login').style.display = 'none';
        document.getElementById('pdv').style.display = 'block';
        init();
    } else {
        errorElement.textContent = 'Usuário não encontrado ou senha incorreta';
        document.getElementById('login-senha').value = '';
    }
}

function logout() {
    currentUser = null;
    document.getElementById('login').style.display = 'flex'; // Mudado para flex para centralizar
    document.getElementById('pdv').style.display = 'none';
    // Limpa os campos de login
    document.getElementById('login-nome').value = '';
    document.getElementById('login-senha').value = '';
    document.getElementById('login-error').textContent = '';
}

// Controle de Abas
function mudarAba(abaId) {
    if (abaId === 'gestao') {
        showAuthModal('Acesso à Área de Gestão', (vendedor) => {
            if (!vendedor.isAdmin) {
                showNotification('Acesso Negado', 'Apenas administradores podem acessar esta área.', 'error');
        return;
    }

    document.querySelectorAll('.conteudo-aba').forEach(aba => aba.classList.remove('ativa'));
    document.querySelectorAll('.aba').forEach(aba => aba.classList.remove('ativa'));
    document.getElementById(abaId).classList.add('ativa');
    document.querySelector(`[onclick="mudarAba('${abaId}')"]`).classList.add('ativa');

        atualizarListaEstoque();
        preencherSelectAjuste();
        atualizarListaVendedores();
            atualizarAnaliseLucro();
        });
        return;
    }

    document.querySelectorAll('.conteudo-aba').forEach(aba => aba.classList.remove('ativa'));
    document.querySelectorAll('.aba').forEach(aba => aba.classList.remove('ativa'));
    document.getElementById(abaId).classList.add('ativa');
    document.querySelector(`[onclick="mudarAba('${abaId}')"]`).classList.add('ativa');

    if (abaId === 'controle') {
        atualizarRelatorioCaixa();
        atualizarPagamentosGrid();
        gerarGraficoDesempenho();
    }
}

// Funções de Vendas
function filterProducts() {
    const searchTerm = document.getElementById('search-product').value.toLowerCase();
    const filtered = produtos.filter(p => p.nome.toLowerCase().includes(searchTerm));
    renderProducts(filtered);
}

function renderProducts(productsArray) {
    const container = document.getElementById('produtos');
    container.innerHTML = '';

    productsArray.forEach(produto => {
        const div = document.createElement('div');
        div.className = 'produto';
        div.innerHTML = `
            <div class="produto-header">
            <h3>${produto.nome}</h3>
                <span class="produto-preco">R$ ${produto.preco.toFixed(2)}</span>
            </div>
            <div class="produto-info">
                <div class="info-item">
                    <span>Estoque: ${produto.estoque} un.</span>
                    ${produto.estoque <= 5 ? '<span class="alerta-estoque">⚠️ Baixo</span>' : ''}
                </div>
                ${produto.maxDesconto ? `<span class="desconto-max">Desc. Máx: ${produto.maxDesconto}%</span>` : ''}
            </div>
            <button class="produto-btn ${produto.estoque <= 0 ? 'disabled' : ''}" 
                ${produto.estoque <= 0 ? 'disabled' : ''} 
                onclick="adicionarAoCarrinho(${produto.id})">
                ${produto.estoque <= 0 ? 'Esgotado' : 'Adicionar'}
            </button>
        `;
        container.appendChild(div);
    });
}

function adicionarAoCarrinho(id) {
    const produto = produtos.find(p => p.id === id);
    if (produto.estoque <= 0) return;

    const itemExistente = carrinho.find(item => item.id === id);

    if (itemExistente) {
        if (itemExistente.quantidade >= produto.estoque) {
            alert('Estoque insuficiente!');
            return;
        }
        itemExistente.quantidade++;
    } else {
        carrinho.push({
            ...produto,
            quantidade: 1
        });
    }

    atualizarCarrinho();
}

function atualizarCarrinho() {
    const container = document.getElementById('itens-carrinho');
    const totalElement = document.getElementById('total');

    container.innerHTML = '';

    carrinho.forEach(item => {
        const div = document.createElement('div');
        div.className = 'item-carrinho';
        div.innerHTML = `
            <div>
                ${item.nome} 
                <input type="number" value="${item.quantidade}" 
                    min="1" max="${item.estoque}" 
                    onchange="updateQuantity(${item.id}, this.value)">
            </div>
            <div>
                ${item.quantidade}x R$ ${item.preco.toFixed(2)}
                ${item.desconto ? `<br><span style="color:red;">-${item.desconto}%</span>` : ''}
            </div>
            <button onclick="removerItem(${item.id})">X</button>
        `;
        container.appendChild(div);
    });

    totalElement.textContent = getTotal().toFixed(2);
    if (selectedPaymentMethods.includes('dinheiro')) {
        const valorRecebido = parseFloat(document.getElementById('valor-recebido').value) || 0;
        document.getElementById('troco').textContent = (valorRecebido - getTotal()).toFixed(2);
    }
}

function getTotal() {
    return carrinho.reduce((acc, item) => {
        const desconto = item.desconto || 0;
        const precoComDesconto = item.preco * (1 - (desconto / 100));
        return acc + (precoComDesconto * item.quantidade);
    }, 0);
}

function updateQuantity(id, newQuantity) {
    const item = carrinho.find(item => item.id === id);
    const produto = produtos.find(p => p.id === id);

    if (newQuantity > produto.estoque) {
        alert('Estoque insuficiente!');
        item.quantidade = produto.estoque;
        atualizarCarrinho();
        return;
    }

    item.quantidade = parseInt(newQuantity);
    atualizarCarrinho();
}

function removerItem(id) {
    carrinho = carrinho.filter(item => item.id !== id);
    atualizarCarrinho();
}

// Funções de Pagamento
function selectPaymentMethod(method) {
    const element = event.target;
    
    if (selectedPaymentMethods.includes(method)) {
        selectedPaymentMethods = selectedPaymentMethods.filter(m => m !== method);
        element.classList.remove('selected');
    } else {
        if (selectedPaymentMethods.length < 2) {
            selectedPaymentMethods.push(method);
            element.classList.add('selected');
        } else {
            showNotification('Atenção', 'Máximo de 2 formas de pagamento permitidas', 'warning');
            return;
        }
}

    // Atualizar UI
    const mixedPaymentDiv = document.getElementById('mixed-payment');
    const trocoSection = document.getElementById('troco-section');

    if (selectedPaymentMethods.length > 1) {
        mixedPaymentDiv.style.display = 'block';
        renderPaymentSplit(getTotal());
        // No pagamento misto, nunca mostra o troco
        trocoSection.style.display = 'none';
    } else {
        mixedPaymentDiv.style.display = 'none';
        // Mostra troco apenas se for pagamento único em dinheiro
        trocoSection.style.display = selectedPaymentMethods[0] === 'dinheiro' ? 'block' : 'none';
    }
}

function renderPaymentSplit(total) {
    const container = document.getElementById('mixed-payment');
    container.innerHTML = `
        <div class="payment-split">
            <h4>Divisão do Pagamento - Total: R$ ${total.toFixed(2)}</h4>
            ${selectedPaymentMethods.map((method, index) => `
                <div class="payment-split-item">
                    <label>${method.toUpperCase()}:</label>
                    <div class="payment-input-group">
                        <input type="number" 
                            id="valor-${method}" 
                            class="payment-value-input" 
                            step="0.01" 
                            min="0" 
                            max="${total}"
                            ${index === 1 ? 'readonly' : ''}
                            placeholder="Valor em R$" 
                            onchange="updateSplitValues()">
                        <span class="payment-currency">R$</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;

    // Se for o primeiro render, divide o valor igualmente
    const valorPorMetodo = total / selectedPaymentMethods.length;
    selectedPaymentMethods.forEach((method, index) => {
        const input = document.getElementById(`valor-${method}`);
        if (input && index === 0) {
            input.value = valorPorMetodo.toFixed(2);
            updateSplitValues();
        }
    });
}

function updateSplitValues() {
    const total = getTotal();
    const primeiroMetodo = selectedPaymentMethods[0];
    const segundoMetodo = selectedPaymentMethods[1];
    
    const valorPrimeiro = parseFloat(document.getElementById(`valor-${primeiroMetodo}`).value) || 0;
    const valorRestante = total - valorPrimeiro;

    if (valorPrimeiro > total) {
        showNotification('Atenção', 'Valor não pode exceder o total da venda', 'warning');
        document.getElementById(`valor-${primeiroMetodo}`).value = total.toFixed(2);
        document.getElementById(`valor-${segundoMetodo}`).value = '0.00';
        return;
    }

    document.getElementById(`valor-${segundoMetodo}`).value = valorRestante.toFixed(2);
}

function finalizarVenda() {
    if (carrinho.length === 0) {
        showNotification('Atenção', 'Carrinho vazio!', 'warning');
        return;
    }

    if (selectedPaymentMethods.length === 0) {
        showNotification('Atenção', 'Selecione uma forma de pagamento!', 'warning');
        return;
    }

    const total = getTotal();

    // Validação para pagamento misto
    if (selectedPaymentMethods.length > 1) {
        const valorPrimeiro = parseFloat(document.getElementById(`valor-${selectedPaymentMethods[0]}`).value) || 0;
        const valorSegundo = parseFloat(document.getElementById(`valor-${selectedPaymentMethods[1]}`).value) || 0;
        
        if (Math.abs((valorPrimeiro + valorSegundo) - total) > 0.01) {
            showNotification('Atenção', 'A soma dos valores deve ser igual ao total da venda', 'warning');
            return;
        }
    }
    // Validação para pagamento único em dinheiro
    else if (selectedPaymentMethods[0] === 'dinheiro') {
        const valorRecebido = parseFloat(document.getElementById('valor-recebido').value) || 0;
        if (valorRecebido < total) {
            showNotification('Atenção', 'Valor recebido insuficiente!', 'warning');
        return;
        }
    }

    // Continuar com a finalização da venda...
    showAuthModal('Confirmar Venda', (vendedor) => {
        const venda = {
            id: Date.now(),
            data: new Date().toISOString(),
            itens: carrinho.map(item => ({
                ...item,
                desconto: item.desconto || 0
            })),
            total: total,
            pagamento: selectedPaymentMethods.length > 1 ? 
                selectedPaymentMethods.map(method => ({
                    method,
                    value: parseFloat(document.getElementById(`valor-${method}`).value)
                })) : 
                selectedPaymentMethods,
            vendedor: vendedor.nome,
            descontoAplicado: carrinho.some(item => item.desconto) ? carrinho[0].desconto : 0
        };

    // Atualizar estoque
    carrinho.forEach(item => {
        const produto = produtos.find(p => p.id === item.id);
        produto.estoque -= item.quantidade;
    });

        vendas.push(venda);
    salvarDados();

        // Limpar carrinho e interface
    carrinho = [];
    selectedPaymentMethods = [];
        document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));
        document.getElementById('mixed-payment').style.display = 'none';
        document.getElementById('troco-section').style.display = 'none';
        document.getElementById('valor-recebido').value = '';
        
    atualizarCarrinho();
        renderProducts(produtos);
        showNotification('Sucesso', 'Venda finalizada com sucesso!', 'success');
        atualizarRelatorioCaixa();
        atualizarPagamentosGrid();
    });
}

// Funções de Estoque
function mostrarModalCadastro() {
    const modalHTML = `
        <div class="modal-overlay" id="modal-cadastro">
            <div class="modal-content modal-produto">
                <span class="modal-close" onclick="fecharModal('modal-cadastro')">×</span>
                <h3>Cadastrar Novo Produto</h3>
                
                <div class="form-cadastro">
                    <input type="text" id="nome-produto" placeholder="Nome do Produto">
                    <input type="number" id="preco-custo" step="0.01" placeholder="Preço de Custo" onchange="calcularMargem()">
                    <input type="number" id="preco-produto" step="0.01" placeholder="Preço de Venda" onchange="calcularMargem()">
                    <div class="margem-info">
                        <span>Margem de Lucro: </span>
                        <span id="margem-lucro">0%</span>
                    </div>
                    <input type="number" id="estoque-inicial" placeholder="Estoque Inicial">
                    <input type="number" id="max-desconto" placeholder="Desconto Máximo (%)">
                    <button onclick="cadastrarProduto()">Cadastrar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Adicionar event listeners para os inputs de preço
    document.getElementById('preco-custo').addEventListener('input', calcularMargem);
    document.getElementById('preco-produto').addEventListener('input', calcularMargem);
}

function mostrarModalEstoque() {
    const modalHTML = `
        <div class="modal-overlay" id="modal-estoque">
            <div class="modal-content modal-estoque">
                <span class="modal-close" onclick="fecharModal('modal-estoque')">×</span>
                <h3>Ajuste de Estoque</h3>
                
                <div class="estoque-actions">
                    <div class="ajuste-estoque">
                        <select id="produto-ajuste">
                            <option value="">Selecione um produto</option>
                        </select>
                        <input type="number" id="quantidade-ajuste" placeholder="Quantidade">
                        <button onclick="ajustarEstoque()">Aplicar Ajuste</button>
                        <button onclick="editarProduto()">Editar Produto</button>
                        <button onclick="excluirProduto()">Excluir Produto</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    preencherSelectAjuste();
}

function mostrarModalListaEstoque() {
    const modalHTML = `
        <div class="modal-overlay" id="modal-lista">
            <div class="modal-content modal-lista">
                <span class="modal-close" onclick="fecharModal('modal-lista')">×</span>
                <h3>Estoque Atual</h3>
                
                <div class="estoque-list">
                    <div id="lista-estoque"></div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    atualizarListaEstoque();
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

function cadastrarProduto() {
    const nome = document.getElementById('nome-produto').value;
    const precoCusto = parseFloat(document.getElementById('preco-custo').value);
    const precoVenda = parseFloat(document.getElementById('preco-produto').value);
    const estoque = parseInt(document.getElementById('estoque-inicial').value);
    const maxDesconto = parseInt(document.getElementById('max-desconto').value) || 0;

    if (!nome || isNaN(precoCusto) || isNaN(precoVenda) || isNaN(estoque)) {
        showNotification('Erro', 'Preencha todos os campos corretamente!', 'error');
        return;
    }

    if (precoCusto >= precoVenda) {
        showNotification('Erro', 'O preço de venda deve ser maior que o preço de custo!', 'error');
        return;
    }

    const margemLucro = ((precoVenda - precoCusto) / precoCusto) * 100;

    produtos.push({
        id: Date.now(),
        nome,
        precoCusto,
        preco: precoVenda,
        estoque,
        maxDesconto,
        margemLucro
    });

    salvarDados();
    fecharModal('modal-cadastro');
    atualizarAnaliseLucro();
    showNotification('Sucesso', 'Produto cadastrado com sucesso!', 'success');
}

function preencherSelectAjuste() {
    const select = document.getElementById('produto-ajuste');
    select.innerHTML = '<option value="">Selecione um produto</option>';

    produtos.forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.id;
        option.textContent = `${produto.nome} (Estoque: ${produto.estoque})`;
        select.appendChild(option);
    });
}

function ajustarEstoque() {
    const produtoId = document.getElementById('produto-ajuste').value;
    const quantidade = parseInt(document.getElementById('quantidade-ajuste').value);

    if (!produtoId || isNaN(quantidade)) {
        showNotification('Atenção', 'Selecione um produto e insira uma quantidade válida!', 'warning');
        return;
    }

    showAuthModal('Confirmar Ajuste de Estoque', (vendedor) => {
        if (!vendedor.isAdmin) {
            showNotification('Acesso Negado', 'Apenas administradores podem ajustar o estoque!', 'error');
        return;
    }

    const produto = produtos.find(p => p.id == produtoId);
        const estoqueAnterior = produto.estoque;
    produto.estoque += quantidade;

    if (produto.estoque < 0) {
            showNotification('Atenção', 'O estoque não pode ser negativo!', 'warning');
        produto.estoque = 0;
    }

        // Registrar o ajuste
        const ajuste = {
            data: new Date().toISOString(),
            produto: produto.nome,
            quantidadeAjustada: quantidade,
            estoqueAnterior: estoqueAnterior,
            estoqueNovo: produto.estoque,
            responsavel: vendedor.nome
        };

        // Salvar o ajuste no histórico (opcional)
        const ajustes = JSON.parse(localStorage.getItem('ajustes_estoque')) || [];
        ajustes.push(ajuste);
        localStorage.setItem('ajustes_estoque', JSON.stringify(ajustes));

    salvarDados();
    atualizarListaEstoque();
        atualizarAnaliseLucro();
    preencherSelectAjuste();
    document.getElementById('quantidade-ajuste').value = '';
        
        showNotification('Sucesso', `Estoque ajustado com sucesso!\nProduto: ${produto.nome}\nAjuste: ${quantidade > 0 ? '+' : ''}${quantidade}\nEstoque Anterior: ${estoqueAnterior}\nNovo Estoque: ${produto.estoque}`, 'success');
        fecharModal('modal-estoque');
    });
}

function editarProduto() {
    const produtoId = document.getElementById('produto-ajuste').value;
    if (!produtoId) {
        showNotification('Atenção', 'Selecione um produto para editar!', 'warning');
        return;
    }

    const produto = produtos.find(p => p.id == produtoId);
    
    showAuthModal('Editar Produto', (vendedor) => {
        if (!vendedor.isAdmin) {
            showNotification('Acesso Negado', 'Apenas administradores podem editar produtos!', 'error');
            return;
        }

    const novoNome = prompt('Digite o novo nome do produto:', produto.nome);
        const novoPrecoCusto = parseFloat(prompt('Digite o novo preço de custo:', produto.precoCusto));
        const novoPrecoVenda = parseFloat(prompt('Digite o novo preço de venda:', produto.preco));
    const novoEstoque = parseInt(prompt('Digite o novo estoque do produto:', produto.estoque));
    const novoDesconto = parseInt(prompt('Digite o novo desconto máximo do produto:', produto.maxDesconto));

    if (novoNome) produto.nome = novoNome;
        if (!isNaN(novoPrecoCusto)) produto.precoCusto = novoPrecoCusto;
        if (!isNaN(novoPrecoVenda)) {
            if (novoPrecoVenda <= novoPrecoCusto) {
                showNotification('Erro', 'O preço de venda deve ser maior que o preço de custo!', 'error');
                return;
            }
            produto.preco = novoPrecoVenda;
            produto.margemLucro = ((novoPrecoVenda - produto.precoCusto) / produto.precoCusto) * 100;
        }
    if (!isNaN(novoEstoque)) produto.estoque = novoEstoque;
    if (!isNaN(novoDesconto)) produto.maxDesconto = novoDesconto;

    salvarDados();
    atualizarListaEstoque();
        atualizarAnaliseLucro();
    preencherSelectAjuste();
        showNotification('Sucesso', 'Produto editado com sucesso!', 'success');
        fecharModal('modal-estoque');
    });
}

function excluirProduto() {
    const produtoId = document.getElementById('produto-ajuste').value;
    if (!produtoId) {
        showNotification('Atenção', 'Selecione um produto para excluir!', 'warning');
        return;
    }

    if (confirm('Tem certeza que deseja excluir este produto?')) {
        produtos = produtos.filter(p => p.id != produtoId);
        salvarDados();
        atualizarListaEstoque();
        preencherSelectAjuste();
        showNotification('Sucesso', 'Produto excluído com sucesso!', 'success');
        fecharModal('modal-estoque');
    }
}

function atualizarListaEstoque() {
    const lista = document.getElementById('lista-estoque');
    lista.innerHTML = '';

    produtos.forEach(produto => {
        const margemClass = produto.margemLucro > 50 ? 'margem-alta' : 
                          produto.margemLucro > 30 ? 'margem-media' : 'margem-baixa';
        
        const div = document.createElement('div');
        div.className = 'item-carrinho';
        div.innerHTML = `
            <div>
                ${produto.nome}
                ${produto.estoque <= 5 ? '<span class="alerta-estoque">⚠️ Estoque Baixo!</span>' : ''}
            </div>
            <div class="${produto.estoque <= 5 ? 'estoque-baixo' : ''}">
                Estoque: ${produto.estoque}
            </div>
            <div>
                <div>Custo: R$ ${produto.precoCusto.toFixed(2)}</div>
                <div>Venda: R$ ${produto.preco.toFixed(2)}</div>
                <div class="${margemClass}">Margem: ${produto.margemLucro.toFixed(2)}%</div>
            </div>
            <div>
            <div>Desc. Máx: ${produto.maxDesconto}%</div>
                <div>Lucro/un: R$ ${(produto.preco - produto.precoCusto).toFixed(2)}</div>
            </div>
        `;
        lista.appendChild(div);
    });
}

// Funções de Vendedores
function abrirGestaoVendedores() {
    showAuthModal('Acesso à Gestão de Vendedores', (vendedor) => {
        if (!vendedor.isAdmin) {
            showNotification('Erro', 'Apenas administradores podem acessar esta área', 'error');
            return;
        }

        const modalHTML = `
            <div class="modal-overlay" id="gestao-vendedores-modal">
                <div class="modal-content modal-vendedores">
                    <span class="modal-close" onclick="document.getElementById('gestao-vendedores-modal').remove()">×</span>
                    <h3>Gestão de Vendedores</h3>
                    
                    <div class="vendedor-cadastro">
                        <h4>Cadastrar Novo Vendedor</h4>
                        <div class="form-grid">
                            <div class="form-group">
                                <label>Nome</label>
                                <input type="text" id="nome-vendedor" placeholder="Nome do vendedor">
                            </div>
                            <div class="form-group">
                                <label>Senha</label>
                                <input type="password" id="senha-vendedor" placeholder="Senha">
                            </div>
                            <div class="form-group">
                                <label>Confirmar Senha</label>
                                <input type="password" id="confirma-senha-vendedor" placeholder="Confirme a senha">
                            </div>
                            <div class="form-group checkbox-group">
                                <label>
                                    <input type="checkbox" id="is-admin-vendedor">
                                    Administrador
                                </label>
                            </div>
                        </div>
                        <button class="btn-action" onclick="cadastrarVendedor()">
                            <i class="fas fa-user-plus"></i>
                            Cadastrar Vendedor
                        </button>
                    </div>
                    
                    <div class="vendedores-lista">
                        <h4>Vendedores Cadastrados</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Status</th>
                                    <th>Tipo</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody id="lista-vendedores">
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        atualizarListaVendedores();
    });
}

function cadastrarVendedor() {
    const nome = document.getElementById('nome-vendedor').value;
    const senha = document.getElementById('senha-vendedor').value;
    const confirmaSenha = document.getElementById('confirma-senha-vendedor').value;
    const isAdmin = document.getElementById('is-admin-vendedor').checked;

    if (!nome || !senha || !confirmaSenha) {
        showNotification('Erro', 'Preencha todos os campos', 'error');
        return;
    }

    if (senha !== confirmaSenha) {
        showNotification('Erro', 'As senhas não coincidem', 'error');
        return;
    }

    if (vendedores.some(v => v.nome === nome)) {
        showNotification('Erro', 'Vendedor já cadastrado', 'error');
        return;
    }

    vendedores.push({
        id: Date.now(),
        nome: nome,
        senha: senha,
        isAdmin: isAdmin,
        ativo: true
    });

    salvarDados();
    atualizarListaVendedores();
    showNotification('Sucesso', 'Vendedor cadastrado com sucesso', 'success');

    // Limpar campos
    document.getElementById('nome-vendedor').value = '';
    document.getElementById('senha-vendedor').value = '';
    document.getElementById('confirma-senha-vendedor').value = '';
    document.getElementById('is-admin-vendedor').checked = false;
}

function atualizarListaVendedores() {
    const lista = document.getElementById('lista-vendedores');
    if (!lista) return;

    lista.innerHTML = vendedores.map(vendedor => `
        <tr>
            <td>${vendedor.nome}</td>
            <td>
                <span class="status-badge ${vendedor.ativo ? 'ativo' : 'inativo'}">
                    ${vendedor.ativo ? 'Ativo' : 'Inativo'}
                </span>
            </td>
            <td>
                <span class="tipo-badge ${vendedor.isAdmin ? 'admin' : 'vendedor'}">
                    ${vendedor.isAdmin ? 'Administrador' : 'Vendedor'}
                </span>
            </td>
            <td class="acoes-vendedor">
                <button onclick="editarSenhaVendedor(${vendedor.id})" class="btn-icon" title="Alterar Senha">
                    <i class="fas fa-key"></i>
                </button>
                <button onclick="toggleStatusVendedor(${vendedor.id})" class="btn-icon" title="${vendedor.ativo ? 'Desativar' : 'Ativar'}">
                    <i class="fas fa-${vendedor.ativo ? 'user-slash' : 'user-check'}"></i>
                </button>
                <button onclick="toggleAdminVendedor(${vendedor.id})" class="btn-icon" title="Alterar Tipo">
                    <i class="fas fa-user-shield"></i>
                </button>
                ${!vendedor.isAdmin ? `
                    <button onclick="confirmarExclusaoVendedor(${vendedor.id})" class="btn-icon btn-delete" title="Excluir Vendedor">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

function editarSenhaVendedor(id) {
    const vendedor = vendedores.find(v => v.id === id);
    if (!vendedor) return;

    const modalHTML = `
        <div class="modal-overlay" id="editar-senha-modal">
            <div class="modal-content modal-senha">
                <span class="modal-close" onclick="document.getElementById('editar-senha-modal').remove()">×</span>
                <h3>Alterar Senha - ${vendedor.nome}</h3>
                <div class="form-group">
                    <label>Nova Senha</label>
                    <input type="password" id="nova-senha" placeholder="Nova senha">
            </div>
                <div class="form-group">
                    <label>Confirmar Nova Senha</label>
                    <input type="password" id="confirma-nova-senha" placeholder="Confirme a nova senha">
                </div>
                <div class="modal-actions">
                    <button onclick="salvarNovaSenha(${id})" class="btn-action">
                        <i class="fas fa-save"></i>
                        Salvar
                </button>
                </div>
            </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function salvarNovaSenha(id) {
    const novaSenha = document.getElementById('nova-senha').value;
    const confirmaNovaSenha = document.getElementById('confirma-nova-senha').value;

    if (!novaSenha || !confirmaNovaSenha) {
        showNotification('Erro', 'Preencha todos os campos', 'error');
        return;
    }

    if (novaSenha !== confirmaNovaSenha) {
        showNotification('Erro', 'As senhas não coincidem', 'error');
        return;
    }

    const vendedor = vendedores.find(v => v.id === id);
    if (vendedor) {
        vendedor.senha = novaSenha;
    salvarDados();
        document.getElementById('editar-senha-modal').remove();
        showNotification('Sucesso', 'Senha alterada com sucesso', 'success');
    }
}

function toggleStatusVendedor(id) {
    const vendedor = vendedores.find(v => v.id === id);
    if (vendedor) {
    vendedor.ativo = !vendedor.ativo;
    salvarDados();
    atualizarListaVendedores();
        showNotification('Sucesso', `Vendedor ${vendedor.ativo ? 'ativado' : 'desativado'} com sucesso`, 'success');
    }
}

function toggleAdminVendedor(id) {
    const vendedor = vendedores.find(v => v.id === id);
    if (vendedor) {
        vendedor.isAdmin = !vendedor.isAdmin;
        salvarDados();
        atualizarListaVendedores();
        showNotification('Sucesso', `Tipo de usuário alterado com sucesso`, 'success');
    }
}

function confirmarExclusaoVendedor(id) {
    const vendedor = vendedores.find(v => v.id === id);
    if (!vendedor) return;

    const modalHTML = `
        <div class="modal-overlay" id="confirmar-exclusao-modal">
            <div class="modal-content modal-confirmacao">
                <h3>Confirmar Exclusão</h3>
                <p>Tem certeza que deseja excluir o vendedor "${vendedor.nome}"?</p>
                <p class="warning-text">Esta ação não pode ser desfeita!</p>
                <div class="modal-actions">
                    <button onclick="excluirVendedor(${id})" class="btn-action btn-delete">
                        <i class="fas fa-trash-alt"></i>
                        Confirmar Exclusão
                    </button>
                    <button onclick="document.getElementById('confirmar-exclusao-modal').remove()" class="btn-action btn-cancel">
                        <i class="fas fa-times"></i>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function excluirVendedor(id) {
    const vendedor = vendedores.find(v => v.id === id);
    if (!vendedor || vendedor.isAdmin) {
        showNotification('Erro', 'Não é possível excluir um administrador', 'error');
        return;
    }

    vendedores = vendedores.filter(v => v.id !== id);
    salvarDados();
    document.getElementById('confirmar-exclusao-modal').remove();
    atualizarListaVendedores();
    showNotification('Sucesso', 'Vendedor excluído com sucesso', 'success');
}

// Funções de Controle
function gerarRelatorioVendas() {
    const relatorio = document.getElementById('relatorio');
    const filtroData = document.getElementById('filtro-data').value;
    const filtroVendedor = document.getElementById('filtro-vendedor').value.toLowerCase();
    const filtroProduto = document.getElementById('filtro-produto').value.toLowerCase();
    const filtroPagamento = document.getElementById('filtro-pagamento').value;

    // Cálculos gerais do dia
    let totalVendasHoje = 0;
    let totalRetiradasHoje = 0;
    let totalDescontosHoje = 0;
    let vendasPorFormaPagamento = {
        dinheiro: 0,
        pix: 0,
        credito: 0,
        debito: 0
    };
    
    const hoje = new Date().toISOString().split('T')[0];
    
    // Filtrar vendas
    const vendasFiltradas = vendas.filter(venda => {
        const dataVenda = venda.data.split('T')[0];
        const vendedor = venda.vendedor.toLowerCase();
        const produtos = venda.itens.map(item => item.nome.toLowerCase()).join(', ');
        const pagamento = venda.pagamento.join(', ').toLowerCase();

        return (!filtroData || dataVenda === filtroData) &&
               (!filtroVendedor || vendedor.includes(filtroVendedor)) &&
               (!filtroProduto || produtos.includes(filtroProduto)) &&
               (!filtroPagamento || pagamento.includes(filtroPagamento));
    });

    // Calcular totais
    vendasFiltradas.forEach(venda => {
        const dataVenda = venda.data.split('T')[0];
        if (dataVenda === hoje) {
            totalVendasHoje += venda.total;
            totalDescontosHoje += venda.total * (venda.descontoAplicado / 100);
            
            // Somar por forma de pagamento
            venda.pagamento.forEach(forma => {
                if (forma.toLowerCase() in vendasPorFormaPagamento) {
                    vendasPorFormaPagamento[forma.toLowerCase()] += venda.total / venda.pagamento.length;
                }
            });
        }
    });

    // Calcular retiradas do dia
    retiradas.forEach(retirada => {
        const dataRetirada = retirada.data.split('T')[0];
        if (dataRetirada === hoje) {
            totalRetiradasHoje += retirada.valor;
        }
    });

    // Gerar HTML do relatório
    let html = `
        <div class="relatorio-cards">
            <div class="relatorio-card">
                <h4>Total de Vendas Hoje</h4>
                <div class="valor positivo">R$ ${totalVendasHoje.toFixed(2)}</div>
            </div>
            <div class="relatorio-card">
                <h4>Total de Retiradas</h4>
                <div class="valor negativo">R$ ${totalRetiradasHoje.toFixed(2)}</div>
            </div>
            <div class="relatorio-card">
                <h4>Saldo em Caixa</h4>
                <div class="valor ${totalVendasHoje - totalRetiradasHoje >= 0 ? 'positivo' : 'negativo'}">
                    R$ ${(totalVendasHoje - totalRetiradasHoje).toFixed(2)}
                </div>
            </div>
            <div class="relatorio-card">
                <h4>Total de Descontos</h4>
                <div class="valor negativo">R$ ${totalDescontosHoje.toFixed(2)}</div>
            </div>
        </div>

        <div class="relatorio-pagamentos">
            <h4>Vendas por Forma de Pagamento</h4>
            <div class="pagamentos-grid">
                ${Object.entries(vendasPorFormaPagamento).map(([forma, valor]) => `
                    <div class="pagamento-card">
                        <h5>${forma.toUpperCase()}</h5>
                        <div class="valor">R$ ${valor.toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="relatorio-vendas">
            <h4>Histórico de Vendas</h4>
            <div class="vendas-table">
                <table>
                    <thead>
                        <tr>
                            <th>Data/Hora</th>
                            <th>Vendedor</th>
                            <th>Produtos</th>
                            <th>Pagamento</th>
                            <th>Desconto</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${vendasFiltradas.map(venda => `
                            <tr>
                                <td>${new Date(venda.data).toLocaleString()}</td>
                                <td>${venda.vendedor}</td>
                                <td>${venda.itens.map(item => 
                                    `${item.nome} (${item.quantidade}x R$${item.preco.toFixed(2)})`
                                ).join('<br>')}</td>
                                <td>${venda.pagamento.join(', ')}</td>
                                <td>${venda.descontoAplicado}%</td>
                                <td>R$ ${venda.total.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            </div>
        `;

    relatorio.innerHTML = html;
}

function exportarRelatorioCSV() {
    const filtroData = document.getElementById('filtro-data').value;
    const filtroVendedor = document.getElementById('filtro-vendedor').value.toLowerCase();
    const filtroProduto = document.getElementById('filtro-produto').value.toLowerCase();
    const filtroPagamento = document.getElementById('filtro-pagamento').value;

    const vendasFiltradas = vendas.filter(venda => {
        const dataVenda = venda.data.split('T')[0];
        const vendedor = venda.vendedor.toLowerCase();
        const produtos = venda.itens.map(item => item.nome.toLowerCase()).join(', ');
        const pagamento = venda.pagamento.join(', ');

        return (!filtroData || dataVenda === filtroData) &&
               (!filtroVendedor || vendedor.includes(filtroVendedor)) &&
               (!filtroProduto || produtos.includes(filtroProduto)) &&
               (!filtroPagamento || pagamento.includes(filtroPagamento));
    });

    let csv = 'Data,Vendedor,Produtos,Quantidade,Preço Unitário,Desconto,Forma de Pagamento,Total\n';

    vendasFiltradas.forEach(venda => {
        venda.itens.forEach(item => {
            csv += `${new Date(venda.data).toLocaleString()},${venda.vendedor},${item.nome},${item.quantidade},${item.preco.toFixed(2)},${venda.descontoAplicado}%,${venda.pagamento.join(', ')},${(item.preco * item.quantidade * (1 - (venda.descontoAplicado / 100))).toFixed(2)}\n`;
        });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'relatorio-vendas.csv';
    a.click();
}

function gerarGraficoDesempenho() {
    const ctx = document.getElementById('graficoDesempenho').getContext('2d');
    const vendedoresMap = {};

    vendas.forEach(venda => {
        if (!vendedoresMap[venda.vendedor]) {
            vendedoresMap[venda.vendedor] = 0;
        }
        vendedoresMap[venda.vendedor] += venda.total;
    });

    const labels = Object.keys(vendedoresMap);
    const data = Object.values(vendedoresMap);

    // Destruir gráfico anterior se existir
    if (window.vendedoresChart) {
        window.vendedoresChart.destroy();
    }

    window.vendedoresChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total de Vendas por Vendedor',
                data: data,
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return 'R$ ' + value.toFixed(2);
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });

    // Ajustar altura do canvas
    ctx.canvas.parentNode.style.height = '400px';
}

function mostrarHistoricoRetiradas() {
    const modalHTML = `
        <div class="modal-overlay" id="modal-historico">
            <div class="modal-content">
                <span class="modal-close" onclick="fecharModalHistorico()">×</span>
                <h3>Histórico de Retiradas</h3>
                <div id="lista-historico-retiradas"></div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    atualizarHistoricoRetiradas();
}

function fecharModalHistorico() {
    const modal = document.getElementById('modal-historico');
    if (modal) {
        modal.remove();
    }
}

function atualizarHistoricoRetiradas() {
    const container = document.getElementById('lista-historico-retiradas');
    if (!container) return;

    const retiradasOrdenadas = [...retiradas].sort((a, b) => new Date(b.data) - new Date(a.data));

    container.innerHTML = retiradasOrdenadas.map(retirada => `
        <div class="historico-retirada-item">
            <div class="valor">R$ ${retirada.valor.toFixed(2)}</div>
            <div class="motivo">${retirada.motivo}</div>
            <div class="vendedor">Autorizado por: ${retirada.vendedor}</div>
            <div class="data">${new Date(retirada.data).toLocaleString()}</div>
        </div>
    `).join('');
}

// Atualizar a função iniciarRetirada para fechar o modal após registrar
function iniciarRetirada() {
    const valor = parseFloat(document.getElementById('valor-retirada').value);
    const motivo = document.getElementById('motivo-retirada').value;

    if (!valor || valor <= 0) {
        showNotification('Atenção', 'Por favor, insira um valor válido', 'warning');
        return;
    }

    if (!motivo) {
        showNotification('Atenção', 'Por favor, insira o motivo da retirada', 'warning');
        return;
    }

    showAuthModal('Confirmar Retirada de Caixa', (vendedor) => {
        const retirada = {
            id: Date.now(),
            data: new Date().toISOString(),
            valor: valor,
            motivo: motivo,
            vendedor: vendedor.nome
        };

        retiradas.push(retirada);
        localStorage.setItem('retiradas', JSON.stringify(retiradas));
        
        document.getElementById('valor-retirada').value = '';
        document.getElementById('motivo-retirada').value = '';
        
        showNotification('Sucesso', 'Retirada registrada com sucesso!', 'success');
        atualizarRelatorioCaixa();
        atualizarHistoricoRetiradas();
    });
}

// Função para salvar dados no localStorage
function salvarDados() {
    localStorage.setItem('produtos', JSON.stringify(produtos));
    localStorage.setItem('vendas', JSON.stringify(vendas));
    localStorage.setItem('vendedores', JSON.stringify(vendedores));
    localStorage.setItem('retiradas', JSON.stringify(retiradas));
}

// Adicione esta função para calcular margem em tempo real
function calcularMargem() {
    const precoCusto = parseFloat(document.getElementById('preco-custo').value) || 0;
    const precoVenda = parseFloat(document.getElementById('preco-produto').value) || 0;
    const margemElement = document.getElementById('margem-lucro');

    if (precoCusto > 0 && precoVenda > 0) {
        const margem = ((precoVenda - precoCusto) / precoCusto) * 100;
        margemElement.textContent = `${margem.toFixed(1)}%`;
        
        // Adicionar classes para feedback visual
        if (margem < 0) {
            margemElement.className = 'negativo';
        } else if (margem < 30) {
            margemElement.className = 'atencao';
        } else {
            margemElement.className = 'positivo';
        }
    } else {
        margemElement.textContent = '0%';
        margemElement.className = '';
    }
}

function atualizarAnaliseLucro() {
    const cardsLucro = document.getElementById('cards-lucro');
    const tabelaProdutos = document.getElementById('tabela-produtos');

    // Cálculos gerais
    const totalProdutos = produtos.length;
    const margemMedia = produtos.reduce((acc, p) => acc + p.margemLucro, 0) / totalProdutos;
    const investimentoTotal = produtos.reduce((acc, p) => acc + (p.precoCusto * p.estoque), 0);
    const valorVendaTotal = produtos.reduce((acc, p) => acc + (p.preco * p.estoque), 0);
    const lucroPotencial = valorVendaTotal - investimentoTotal;

    // Atualizar cards
    cardsLucro.innerHTML = `
        <div class="card-lucro">
            <h4>Margem Média</h4>
            <div class="valor">${margemMedia.toFixed(2)}%</div>
        </div>
        <div class="card-lucro">
            <h4>Investimento Total</h4>
            <div class="valor">R$ ${investimentoTotal.toFixed(2)}</div>
        </div>
        <div class="card-lucro">
            <h4>Lucro Potencial</h4>
            <div class="valor">R$ ${lucroPotencial.toFixed(2)}</div>
        </div>
    `;

    // Atualizar tabela de produtos
    tabelaProdutos.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Produto</th>
                    <th>Preço Custo</th>
                    <th>Preço Venda</th>
                    <th>Margem</th>
                    <th>Estoque</th>
                    <th>Lucro Potencial</th>
                </tr>
            </thead>
            <tbody>
                ${produtos.map(p => {
                    const margemClass = p.margemLucro > 50 ? 'margem-alta' : 
                                      p.margemLucro > 30 ? 'margem-media' : 'margem-baixa';
                    const lucroProduto = (p.preco - p.precoCusto) * p.estoque;
                    
                    return `
                        <tr>
                            <td>${p.nome}</td>
                            <td>R$ ${p.precoCusto.toFixed(2)}</td>
                            <td>R$ ${p.preco.toFixed(2)}</td>
                            <td class="${margemClass}">${p.margemLucro.toFixed(2)}%</td>
                            <td>${p.estoque}</td>
                            <td>R$ ${lucroProduto.toFixed(2)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function limparFormularioProduto() {
    document.getElementById('nome-produto').value = '';
    document.getElementById('preco-custo').value = '';
    document.getElementById('preco-produto').value = '';
    document.getElementById('estoque-inicial').value = '';
    document.getElementById('max-desconto').value = '';
    document.getElementById('margem-lucro').textContent = '0%';
}

// Inicialização
function init() {
    renderProducts(produtos);
    atualizarCarrinho();
    atualizarAnaliseLucro();
}

// Adicionar no início do arquivo, logo após as declarações de variáveis
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const loginBtn = document.getElementById('login-btn');
    const senhaInput = document.getElementById('login-senha');

    if (loginForm) {
        // Prevenir submissão padrão do formulário
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            fazerLogin();
        });

        // Botão de login
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            fazerLogin();
        });

        // Enter no campo de senha
        senhaInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                fazerLogin();
            }
        });
    }

    // Inicializar outras funções
    init();
    atualizarListaEstoque();
    preencherSelectAjuste();
    atualizarListaVendedores();
});

function preencherFiltros() {
    const selectVendedor = document.getElementById('filtro-vendedor');
    const selectProduto = document.getElementById('filtro-produto');

    // Limpar selects
    selectVendedor.innerHTML = '<option value="">Todos os vendedores</option>';
    selectProduto.innerHTML = '<option value="">Todos os produtos</option>';

    // Preencher vendedores únicos das vendas
    const vendedoresUnicos = [...new Set(vendas.map(v => v.vendedor))];
    vendedoresUnicos.sort().forEach(vendedor => {
        const option = document.createElement('option');
        option.value = vendedor.toLowerCase();
        option.textContent = vendedor;
        selectVendedor.appendChild(option);
    });

    // Preencher produtos únicos das vendas
    const produtosUnicos = [...new Set(vendas.flatMap(v => v.itens.map(i => i.nome)))];
    produtosUnicos.sort().forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.toLowerCase();
        option.textContent = produto;
        selectProduto.appendChild(option);
    });
}

// Sistema de Notificações
function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    notification.innerHTML = `
        <div class="notification-icon">${icons[type]}</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <div class="notification-close" onclick="this.parentElement.remove()">×</div>
    `;

    container.appendChild(notification);

    // Auto remover após 5 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

function mostrarHistoricoVendas() {
    const modalHTML = `
        <div class="modal-overlay" id="modal-vendas">
            <div class="modal-content modal-vendas">
                <span class="modal-close" onclick="fecharModalVendas()">×</span>
                <h3>Histórico Completo de Vendas</h3>
                
                <div class="modal-filtros">
                    <div class="filtro-grupo">
                        <label for="modal-filtro-data">Data</label>
                        <input type="date" id="modal-filtro-data">
                    </div>
                    <div class="filtro-grupo">
                        <label for="modal-filtro-vendedor">Vendedor</label>
                        <select id="modal-filtro-vendedor">
                            <option value="">Todos os vendedores</option>
                        </select>
                    </div>
                    <div class="filtro-grupo">
                        <label for="modal-filtro-produto">Produto</label>
                        <select id="modal-filtro-produto">
                            <option value="">Todos os produtos</option>
                        </select>
                    </div>
                    <div class="filtro-grupo">
                        <label for="modal-filtro-pagamento">Forma de Pagamento</label>
                        <select id="modal-filtro-pagamento">
                            <option value="">Todas as formas</option>
                            <option value="dinheiro">Dinheiro</option>
                            <option value="pix">PIX</option>
                            <option value="credito">Cartão Crédito</option>
                            <option value="debito">Cartão Débito</option>
                        </select>
                    </div>
                    <div class="filtro-acoes">
                        <button onclick="filtrarHistoricoVendas()">Filtrar</button>
                        <button onclick="exportarHistoricoVendas()">Exportar CSV</button>
                    </div>
                </div>

                <div class="vendas-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Data/Hora</th>
                                <th>Vendedor</th>
                                <th>Produtos</th>
                                <th>Pagamento</th>
                                <th>Desconto</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody id="tabela-historico-vendas"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    preencherFiltrosModal();
    atualizarHistoricoVendas();
}

function fecharModalVendas() {
    const modal = document.getElementById('modal-vendas');
    if (modal) {
        modal.remove();
    }
}

function preencherFiltrosModal() {
    const selectVendedor = document.getElementById('modal-filtro-vendedor');
    const selectProduto = document.getElementById('modal-filtro-produto');

    // Preencher vendedores únicos
    const vendedoresUnicos = [...new Set(vendas.map(v => v.vendedor))];
    vendedoresUnicos.sort().forEach(vendedor => {
        const option = document.createElement('option');
        option.value = vendedor.toLowerCase();
        option.textContent = vendedor;
        selectVendedor.appendChild(option);
    });

    // Preencher produtos únicos
    const produtosUnicos = [...new Set(vendas.flatMap(v => v.itens.map(i => i.nome)))];
    produtosUnicos.sort().forEach(produto => {
        const option = document.createElement('option');
        option.value = produto.toLowerCase();
        option.textContent = produto;
        selectProduto.appendChild(option);
    });
}

function filtrarHistoricoVendas() {
    const filtroData = document.getElementById('modal-filtro-data').value;
    const filtroVendedor = document.getElementById('modal-filtro-vendedor').value.toLowerCase();
    const filtroProduto = document.getElementById('modal-filtro-produto').value.toLowerCase();
    const filtroPagamento = document.getElementById('modal-filtro-pagamento').value.toLowerCase();

    const vendasFiltradas = vendas.filter(venda => {
        const dataVenda = venda.data.split('T')[0];
        const vendedor = venda.vendedor.toLowerCase();
        const produtos = venda.itens.map(item => item.nome.toLowerCase()).join(', ');
        
        // Formatar pagamento para busca
        const pagamento = venda.pagamento.map(p => {
            if (typeof p === 'object') {
                return p.method.toLowerCase();
            }
            return p.toLowerCase();
        }).join(', ');

        return (!filtroData || dataVenda === filtroData) &&
               (!filtroVendedor || vendedor.includes(filtroVendedor)) &&
               (!filtroProduto || produtos.includes(filtroProduto)) &&
               (!filtroPagamento || pagamento.includes(filtroPagamento));
    });

    atualizarHistoricoVendas(vendasFiltradas);
}

function atualizarHistoricoVendas(vendasFiltradas = vendas) {
    const tbody = document.getElementById('tabela-historico-vendas');
    if (!tbody) return;

    const vendasOrdenadas = [...vendasFiltradas].sort((a, b) => new Date(b.data) - new Date(a.data));

    tbody.innerHTML = vendasOrdenadas.map(venda => {
        // Formatar o método de pagamento
        const pagamentoFormatado = venda.pagamento.map(p => {
            if (typeof p === 'object') {
                return `${p.method.toUpperCase()} (R$ ${p.value.toFixed(2)})`;
            }
            return p;
        }).join(' + ');

        return `
            <tr>
                <td>${new Date(venda.data).toLocaleString()}</td>
                <td>${venda.vendedor}</td>
                <td class="venda-produtos">
                    ${venda.itens.map(item => `
                        <div class="venda-produtos-item">
                            ${item.nome} (${item.quantidade}x R$${item.preco.toFixed(2)})
                        </div>
                    `).join('')}
                </td>
                <td>${pagamentoFormatado}</td>
                <td>${venda.descontoAplicado}%</td>
                <td>R$ ${venda.total.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

function exportarHistoricoVendas() {
    const filtroData = document.getElementById('modal-filtro-data').value;
    const filtroVendedor = document.getElementById('modal-filtro-vendedor').value.toLowerCase();
    const filtroProduto = document.getElementById('modal-filtro-produto').value.toLowerCase();
    const filtroPagamento = document.getElementById('modal-filtro-pagamento').value.toLowerCase();

    const vendasFiltradas = vendas.filter(venda => {
        const dataVenda = venda.data.split('T')[0];
        const vendedor = venda.vendedor.toLowerCase();
        const produtos = venda.itens.map(item => item.nome.toLowerCase()).join(', ');
        const pagamento = venda.pagamento.map(p => {
            if (typeof p === 'object') {
                return p.method.toLowerCase();
            }
            return p.toLowerCase();
        }).join(', ');

        return (!filtroData || dataVenda === filtroData) &&
               (!filtroVendedor || vendedor.includes(filtroVendedor)) &&
               (!filtroProduto || produtos.includes(filtroProduto)) &&
               (!filtroPagamento || pagamento.includes(filtroPagamento));
    });

    let csv = 'Data,Vendedor,Produtos,Quantidade,Preço Unitário,Desconto,Forma de Pagamento,Total\n';

    vendasFiltradas.forEach(venda => {
        const pagamentoFormatado = venda.pagamento.map(p => {
            if (typeof p === 'object') {
                return `${p.method} (R$ ${p.value.toFixed(2)})`;
            }
            return p;
        }).join(' + ');

        venda.itens.forEach(item => {
            csv += `${new Date(venda.data).toLocaleString()},${venda.vendedor},"${item.nome}",${item.quantidade},${item.preco.toFixed(2)},${venda.descontoAplicado}%,"${pagamentoFormatado}",${(item.preco * item.quantidade * (1 - (venda.descontoAplicado / 100))).toFixed(2)}\n`;
        });
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historico-vendas.csv';
    a.click();
}

function atualizarRelatorioCaixa() {
    const hoje = new Date().toISOString().split('T')[0];
    let totalVendasHoje = 0;
    let totalRetiradasHoje = 0;
    let totalDescontosHoje = 0;

    // Calcular vendas e descontos do dia
    vendas.forEach(venda => {
        const dataVenda = venda.data.split('T')[0];
        if (dataVenda === hoje) {
            totalVendasHoje += venda.total;
            totalDescontosHoje += venda.total * (venda.descontoAplicado / 100);
        }
    });

    // Calcular retiradas do dia
    retiradas.forEach(retirada => {
        const dataRetirada = retirada.data.split('T')[0];
        if (dataRetirada === hoje) {
            totalRetiradasHoje += retirada.valor;
        }
    });

    // Atualizar os valores nos cards
    document.getElementById('total-vendas').textContent = totalVendasHoje.toFixed(2);
    document.getElementById('saldo-caixa').textContent = `R$ ${(totalVendasHoje - totalRetiradasHoje).toFixed(2)}`;
    document.getElementById('total-descontos').textContent = totalDescontosHoje.toFixed(2);

    // Ajustar cor do saldo em caixa
    const saldoCaixaElement = document.getElementById('saldo-caixa');
    if (totalVendasHoje - totalRetiradasHoje >= 0) {
        saldoCaixaElement.classList.add('positivo');
        saldoCaixaElement.classList.remove('negativo');
    } else {
        saldoCaixaElement.classList.add('negativo');
        saldoCaixaElement.classList.remove('positivo');
    }
}

function atualizarPagamentosGrid() {
    const hoje = new Date().toISOString().split('T')[0];
    const pagamentosGrid = document.getElementById('pagamentos-grid');
    
    // Inicializar contadores
    let vendasPorFormaPagamento = {
        dinheiro: 0,
        pix: 0,
        credito: 0,
        debito: 0
    };

    // Calcular totais por forma de pagamento
    vendas.forEach(venda => {
        const dataVenda = venda.data.split('T')[0];
        if (dataVenda === hoje) {
            // Verificar se é pagamento misto (array de objetos) ou único (array de strings)
            if (typeof venda.pagamento[0] === 'object') {
                // Pagamento misto
                venda.pagamento.forEach(p => {
                    const formaPagamento = p.method.toLowerCase();
                    if (formaPagamento in vendasPorFormaPagamento) {
                        vendasPorFormaPagamento[formaPagamento] += p.value;
                    }
                });
            } else {
                // Pagamento único
                const formaPagamento = venda.pagamento[0].toLowerCase();
                if (formaPagamento in vendasPorFormaPagamento) {
                    vendasPorFormaPagamento[formaPagamento] += venda.total;
                }
            }
        }
    });

    // Gerar HTML para o grid
    pagamentosGrid.innerHTML = Object.entries(vendasPorFormaPagamento)
        .filter(([_, valor]) => valor > 0) // Mostrar apenas formas de pagamento utilizadas
        .map(([forma, valor]) => `
            <div class="pagamento-card">
                <h5>${forma.toUpperCase()}</h5>
                <div class="valor">R$ ${valor.toFixed(2)}</div>
            </div>
        `).join('');
}

function fecharCaixa() {
    showAuthModal('Confirmar Fechamento de Caixa', (vendedor) => {
        if (!vendedor.isAdmin) {
            showNotification('Erro', 'Apenas administradores podem realizar o fechamento de caixa', 'error');
            return;
        }

        const hoje = new Date().toISOString().split('T')[0];
        const vendasHoje = vendas.filter(v => v.data.split('T')[0] === hoje);
        const retiradasHoje = retiradas.filter(r => r.data.split('T')[0] === hoje);

        // Criar objeto de fechamento
        const fechamento = {
            id: Date.now(),
            data: new Date().toISOString(),
            vendedor: vendedor.nome,
            vendas: vendasHoje,
            retiradas: retiradasHoje,
            totais: {
                vendas: vendasHoje.reduce((acc, v) => acc + v.total, 0),
                retiradas: retiradasHoje.reduce((acc, r) => acc + r.valor, 0),
                porFormaPagamento: {}
            }
        };

        // Calcular totais por forma de pagamento
        vendasHoje.forEach(venda => {
            if (typeof venda.pagamento[0] === 'object') {
                venda.pagamento.forEach(p => {
                    const forma = p.method.toLowerCase();
                    fechamento.totais.porFormaPagamento[forma] = 
                        (fechamento.totais.porFormaPagamento[forma] || 0) + p.value;
                });
            } else {
                const forma = venda.pagamento[0].toLowerCase();
                fechamento.totais.porFormaPagamento[forma] = 
                    (fechamento.totais.porFormaPagamento[forma] || 0) + venda.total;
            }
        });

        // Salvar fechamento no histórico
        const historicoFechamentos = JSON.parse(localStorage.getItem('historicoFechamentos') || '[]');
        historicoFechamentos.push(fechamento);
        localStorage.setItem('historicoFechamentos', JSON.stringify(historicoFechamentos));

        // Criar PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Cabeçalho
        doc.setFontSize(20);
        doc.text('Fechamento de Caixa', 105, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Data: ${new Date().toLocaleDateString()}`, 105, 25, { align: 'center' });
        doc.text(`Responsável: ${vendedor.nome}`, 105, 32, { align: 'center' });

        // Resumo Financeiro
        doc.setFontSize(16);
        doc.text('Resumo Financeiro', 14, 40);
        
        const resumoData = [
            ['Total de Vendas', `R$ ${fechamento.totais.vendas.toFixed(2)}`],
            ['Total de Retiradas', `R$ ${fechamento.totais.retiradas.toFixed(2)}`],
            ['Saldo Final', `R$ ${(fechamento.totais.vendas - fechamento.totais.retiradas).toFixed(2)}`]
        ];

        doc.autoTable({
            startY: 45,
            head: [['Descrição', 'Valor']],
            body: resumoData,
            theme: 'grid'
        });

        // Vendas por Forma de Pagamento
        doc.setFontSize(16);
        doc.text('Vendas por Forma de Pagamento', 14, doc.lastAutoTable.finalY + 15);

        const pagamentosData = Object.entries(fechamento.totais.porFormaPagamento)
            .map(([forma, valor]) => [forma.toUpperCase(), `R$ ${valor.toFixed(2)}`]);

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Forma', 'Valor']],
            body: pagamentosData,
            theme: 'grid'
        });

        // Lista de Vendas
        doc.setFontSize(16);
        doc.text('Vendas Realizadas', 14, doc.lastAutoTable.finalY + 15);

        const vendasData = vendasHoje.map(v => [
            new Date(v.data).toLocaleTimeString(),
            v.vendedor,
            v.itens.map(i => `${i.nome} (${i.quantidade}x)`).join(', '),
            typeof v.pagamento[0] === 'object' 
                ? v.pagamento.map(p => `${p.method}: R$ ${p.value.toFixed(2)}`).join(' + ')
                : v.pagamento[0],
            `R$ ${v.total.toFixed(2)}`
        ]);

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Hora', 'Vendedor', 'Itens', 'Pagamento', 'Total']],
            body: vendasData,
            theme: 'grid'
        });

        // Retiradas
        if (retiradasHoje.length > 0) {
            doc.setFontSize(16);
            doc.text('Retiradas Realizadas', 14, doc.lastAutoTable.finalY + 15);

            const retiradasData = retiradasHoje.map(r => [
                new Date(r.data).toLocaleTimeString(),
                r.vendedor,
                r.motivo,
                `R$ ${r.valor.toFixed(2)}`
            ]);

            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Hora', 'Vendedor', 'Motivo', 'Valor']],
                body: retiradasData,
                theme: 'grid'
            });
        }

        // Salvar PDF
        const dataHora = new Date().toLocaleString().replace(/[/:]/g, '-');
        doc.save(`fechamento-caixa-${dataHora}.pdf`);

        // Limpar apenas as vendas e retiradas do dia
        vendas = vendas.filter(v => v.data.split('T')[0] !== hoje);
        retiradas = retiradas.filter(r => r.data.split('T')[0] !== hoje);

        // Salvar alterações
        localStorage.setItem('vendas', JSON.stringify(vendas));
        localStorage.setItem('retiradas', JSON.stringify(retiradas));

        // Atualizar interface
        atualizarRelatorioCaixa();
        atualizarPagamentosGrid();
        showNotification('Sucesso', 'Caixa fechado com sucesso! O relatório foi gerado.', 'success');
    });
}

// Função para visualizar histórico de fechamentos
function visualizarHistoricoFechamentos() {
    showAuthModal('Acessar Histórico de Fechamentos', (vendedor) => {
        if (!vendedor.isAdmin) {
            showNotification('Erro', 'Apenas administradores podem acessar o histórico de fechamentos', 'error');
            return;
        }

        const historicoFechamentos = JSON.parse(localStorage.getItem('historicoFechamentos') || '[]');
        
        const modalHTML = `
            <div class="modal-overlay" id="historico-fechamentos-modal">
                <div class="modal-content modal-lista">
                    <span class="modal-close" onclick="document.getElementById('historico-fechamentos-modal').remove()">×</span>
                    <h3>Histórico de Fechamentos de Caixa</h3>
                    <div class="historico-fechamentos">
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Responsável</th>
                                    <th>Total Vendas</th>
                                    <th>Total Retiradas</th>
                                    <th>Saldo Final</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${historicoFechamentos.map(f => `
                                    <tr>
                                        <td>${new Date(f.data).toLocaleString()}</td>
                                        <td>${f.vendedor}</td>
                                        <td>R$ ${f.totais.vendas.toFixed(2)}</td>
                                        <td>R$ ${f.totais.retiradas.toFixed(2)}</td>
                                        <td>R$ ${(f.totais.vendas - f.totais.retiradas).toFixed(2)}</td>
                                        <td>
                                            <button onclick="gerarPDFFechamento(${f.id})" class="btn-action">
                                                Gerar PDF
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    });
}

function fazerLogout() {
    // Limpar dados da sessão
    currentUser = null;
    selectedPaymentMethods = [];
    carrinho = [];

    // Resetar interface
    document.getElementById('pdv').style.display = 'none';
    document.getElementById('login').style.display = 'flex';
    document.getElementById('valor-recebido').value = '';
    document.getElementById('troco-section').style.display = 'none';
    document.getElementById('mixed-payment').style.display = 'none';
    document.querySelectorAll('.payment-method').forEach(el => el.classList.remove('selected'));

    // Limpar campos de login
    document.getElementById('login-nome').value = '';
    document.getElementById('login-senha').value = '';
    document.getElementById('login-error').textContent = '';

    // Atualizar interface
    atualizarCarrinho();
    showNotification('Sucesso', 'Logout realizado com sucesso', 'success');
}

function gerarPDFFechamento(fechamentoId) {
    const historicoFechamentos = JSON.parse(localStorage.getItem('historicoFechamentos') || '[]');
    const fechamento = historicoFechamentos.find(f => f.id === fechamentoId);
    
    if (!fechamento) {
        showNotification('Erro', 'Fechamento não encontrado', 'error');
        return;
    }

    // Criar PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(20);
    doc.text('Fechamento de Caixa', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Data: ${new Date(fechamento.data).toLocaleDateString()}`, 105, 25, { align: 'center' });
    doc.text(`Responsável: ${fechamento.vendedor}`, 105, 32, { align: 'center' });

    // Resumo Financeiro
    doc.setFontSize(16);
    doc.text('Resumo Financeiro', 14, 40);
    
    const resumoData = [
        ['Total de Vendas', `R$ ${fechamento.totais.vendas.toFixed(2)}`],
        ['Total de Retiradas', `R$ ${fechamento.totais.retiradas.toFixed(2)}`],
        ['Saldo Final', `R$ ${(fechamento.totais.vendas - fechamento.totais.retiradas).toFixed(2)}`]
    ];

    doc.autoTable({
        startY: 45,
        head: [['Descrição', 'Valor']],
        body: resumoData,
        theme: 'grid'
    });

    // Vendas por Forma de Pagamento
    doc.setFontSize(16);
    doc.text('Vendas por Forma de Pagamento', 14, doc.lastAutoTable.finalY + 15);

    const pagamentosData = Object.entries(fechamento.totais.porFormaPagamento)
        .map(([forma, valor]) => [forma.toUpperCase(), `R$ ${valor.toFixed(2)}`]);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Forma', 'Valor']],
        body: pagamentosData,
        theme: 'grid'
    });

    // Lista de Vendas
    doc.setFontSize(16);
    doc.text('Vendas Realizadas', 14, doc.lastAutoTable.finalY + 15);

    const vendasData = fechamento.vendas.map(v => [
        new Date(v.data).toLocaleTimeString(),
        v.vendedor,
        v.itens.map(i => `${i.nome} (${i.quantidade}x)`).join(', '),
        typeof v.pagamento[0] === 'object' 
            ? v.pagamento.map(p => `${p.method}: R$ ${p.value.toFixed(2)}`).join(' + ')
            : v.pagamento[0],
        `R$ ${v.total.toFixed(2)}`
    ]);

    doc.autoTable({
        startY: doc.lastAutoTable.finalY + 20,
        head: [['Hora', 'Vendedor', 'Itens', 'Pagamento', 'Total']],
        body: vendasData,
        theme: 'grid'
    });

    // Retiradas
    if (fechamento.retiradas && fechamento.retiradas.length > 0) {
        doc.setFontSize(16);
        doc.text('Retiradas Realizadas', 14, doc.lastAutoTable.finalY + 15);

        const retiradasData = fechamento.retiradas.map(r => [
            new Date(r.data).toLocaleTimeString(),
            r.vendedor,
            r.motivo,
            `R$ ${r.valor.toFixed(2)}`
        ]);

        doc.autoTable({
            startY: doc.lastAutoTable.finalY + 20,
            head: [['Hora', 'Vendedor', 'Motivo', 'Valor']],
            body: retiradasData,
            theme: 'grid'
        });
    }

    // Salvar PDF
    const dataHora = new Date(fechamento.data).toLocaleString().replace(/[/:]/g, '-');
    doc.save(`fechamento-caixa-${dataHora}.pdf`);
}

function aplicarDescontoGeral() {
    if (carrinho.length === 0) {
        showNotification('Atenção', 'Carrinho vazio!', 'warning');
        return;
    }

    // Modal para inserir o desconto
    const modalHTML = `
        <div class="modal-overlay" id="desconto-modal">
            <div class="modal-content modal-desconto">
                <span class="modal-close" onclick="document.getElementById('desconto-modal').remove()">×</span>
                <h3>Aplicar Desconto Geral</h3>
                <div class="form-group">
                    <label>Porcentagem de Desconto</label>
                    <div class="input-desconto">
                        <input type="number" 
                            id="valor-desconto" 
                            min="0" 
                            max="100" 
                            step="0.1" 
                            placeholder="0.0">
                        <span class="porcentagem-symbol">%</span>
                    </div>
                </div>
                <div class="modal-actions">
                    <button onclick="confirmarDescontoGeral()" class="btn-action">
                        <i class="fas fa-check"></i>
                        Aplicar Desconto
                    </button>
                    <button onclick="document.getElementById('desconto-modal').remove()" class="btn-action btn-cancel">
                        <i class="fas fa-times"></i>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('valor-desconto').focus();
}

function confirmarDescontoGeral() {
    const desconto = parseFloat(document.getElementById('valor-desconto').value);
    
    if (isNaN(desconto) || desconto < 0 || desconto > 100) {
        showNotification('Erro', 'Digite uma porcentagem válida entre 0 e 100', 'error');
        return;
    }

    // Aplicar o mesmo desconto para todos os itens do carrinho
    carrinho.forEach(item => {
        item.desconto = desconto;
    });

    // Fechar modal e atualizar interface
    document.getElementById('desconto-modal').remove();
    atualizarCarrinho();
    showNotification('Sucesso', `Desconto de ${desconto}% aplicado com sucesso!`, 'success');
}