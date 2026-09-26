// ============================================================================
// db.js — tutte le operazioni sul database e sullo storage Supabase.
// ============================================================================

const DB = (() => {
  const TABLE = 'ristoranti';

  async function list() {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .select('*')
      .order('data_visita', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return data;
  }

  async function create(payload) {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function update(id, payload) {
    const { data, error } = await supabaseClient
      .from(TABLE)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async function remove(id) {
    const { error } = await supabaseClient.from(TABLE).delete().eq('id', id);
    if (error) throw error;
  }

  // Ridimensiona e comprime un'immagine lato client prima dell'upload, per
  // risparmiare spazio sul piano gratuito di Supabase Storage e velocizzare
  // il caricamento delle card.
  function compressImage(file, maxDim = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Impossibile leggere il file immagine.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('File immagine non valido.'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            } else {
              width = Math.round(width * (maxDim / height));
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return reject(new Error('Compressione immagine fallita.'));
              resolve(blob);
            },
            'image/jpeg',
            quality
          );
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadFoto(file, onProgress) {
    const blob = await compressImage(file);
    const path = `${crypto.randomUUID()}.jpg`;
    const { error } = await supabaseClient.storage
      .from(FOTO_BUCKET)
      .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = supabaseClient.storage.from(FOTO_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function uploadFotos(files, onEach) {
    const urls = [];
    for (const file of files) {
      const url = await uploadFoto(file);
      urls.push(url);
      if (onEach) onEach(url);
    }
    return urls;
  }

  async function deleteFoto(url) {
    try {
      const marker = `/${FOTO_BUCKET}/`;
      const idx = url.indexOf(marker);
      if (idx === -1) return;
      const path = url.slice(idx + marker.length);
      await supabaseClient.storage.from(FOTO_BUCKET).remove([path]);
    } catch (e) {
      // best-effort: non deve bloccare il resto dell'operazione
      console.warn('Impossibile eliminare la foto dallo storage:', e);
    }
  }

  async function deleteFotos(urls) {
    await Promise.all((urls || []).map(deleteFoto));
  }

  return { list, create, update, remove, uploadFoto, uploadFotos, deleteFoto, deleteFotos };
})();
