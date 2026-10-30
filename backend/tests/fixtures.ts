/**
 * SYNTHETIC TEST FIXTURE — bukan respons asli SerpApi dan tidak boleh dipakai sebagai hasil produksi.
 * Bentuknya mengikuti struktur yang didokumentasikan: visual_matches, organic_results, related_content.
 */
export const SYNTHETIC_LENS_RESPONSE = {
  search_metadata: { status: 'Success' },
  visual_matches: [
    {
      position: 1,
      title: '  Contoh   Halaman Satu  ',
      link: 'https://www.example.test/page-1#bagian',
      source: 'Example Test',
      thumbnail: 'https://thumbs.example.test/t1.jpg',
      image: 'https://img.example.test/full1.jpg',
      exact_matches: false,
    },
    {
      position: 2,
      title: 'Halaman Exact',
      link: 'https://exact.example.test/foto',
      source: 'Exact Test',
      thumbnail: 'https://thumbs.example.test/t2.jpg',
      exact_matches: true,
    },
    {
      position: 3,
      title: 'Tanpa thumbnail',
      link: 'https://notn.example.test/x',
    },
    { position: 4, title: 'Tautan berbahaya', link: 'javascript:alert(1)', thumbnail: 'https://thumbs.example.test/t4.jpg' },
    { position: 5, title: 'Tanpa link' },
    'bukan-objek',
    null,
  ],
  organic_results: [
    {
      position: 1,
      title: 'Duplikat dari visual match',
      link: 'https://www.example.test/page-1#lain',
      snippet: 'Cuplikan dari hasil organik.',
    },
    {
      position: 2,
      title: 'Artikel organik',
      link: 'http://organic.example.test/artikel',
      snippet: '   Cuplikan   panjang   ',
      source: 'Organik',
      thumbnail: 'data:image/png;base64,AAAA',
    },
  ],
  related_content: [
    { query: 'kata kunci terkait', link: 'https://lens.example.test/search?q=1', thumbnail: 'https://thumbs.example.test/r1.jpg' },
    { query: '', link: 'https://lens.example.test/kosong' },
    { query: 'tautan buruk', link: 'ftp://lens.example.test/x' },
  ],
};
