const htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function escapeHtml(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/[&<>"']/g, character => htmlEntities[character]);
}

module.exports = {
  escapeHtml
};
