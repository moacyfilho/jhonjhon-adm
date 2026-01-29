import re

# Ler o arquivo
with open('app/agendamento/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Padrão para encontrar setFormData({ ...formData, ... })
# Captura o conteúdo dentro das chaves
pattern = r'setFormData\(\{\s*\.\.\.formData,\s*([^}]+)\s*\}\)'

# Função de substituição
def replace_func(match):
    props = match.group(1).strip()
    return f'setFormData(prev => ({{ ...prev, {props} }}))'

# Substituir todas as ocorrências
new_content = re.sub(pattern, replace_func, content)

# Salvar o arquivo
with open('app/agendamento/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ Arquivo atualizado com sucesso!")
print(f"Total de substituições: {len(re.findall(pattern, content))}")
