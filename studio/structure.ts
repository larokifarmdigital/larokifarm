import type { StructureResolver } from 'sanity/structure';

export const calendarioStructure: StructureResolver = (S) =>
  S.list()
    .title('Contenido')
    .items([
      S.documentTypeListItem('idioma').title('🌐 Idiomas'),
      S.divider(),
      S.listItem()
        .id('calendario')
        .title('Calendario')
        .child(
          S.list()
            .title('Calendario')
            .items([
              S.documentTypeListItem('comunidad').title('Comunidades'),
              S.documentTypeListItem('vacuna').title('Vacunas'),
              S.documentTypeListItem('dosis').title('Dosis'),
              S.documentTypeListItem('enfermedad').title('Enfermedades'),
            ]),
        ),
      S.documentTypeListItem('farmacia').title('Farmacia'),
      S.divider(),
      S.documentTypeListItem('farmaciaPartner').title('🏷️  Farmacias partner (footer hub)'),
    ]);
