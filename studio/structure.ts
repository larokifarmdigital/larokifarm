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
      S.listItem()
        .id('farmaciaConResenas')
        .title('Farmacia')
        .schemaType('farmacia')
        .child(
          S.documentTypeList('farmacia')
            .title('Farmacia')
            .child((farmaciaId) =>
              S.list()
                .title('Farmacia')
                .items([
                  S.listItem()
                    .id('ficha')
                    .title('📄 Ficha')
                    .child(
                      S.document()
                        .documentId(farmaciaId)
                        .schemaType('farmacia'),
                    ),
                  S.listItem()
                    .id('resenasDeFarmacia')
                    .title('⭐ Sus reseñas')
                    .child(
                      S.documentList()
                        .title('Reseñas de esta farmacia')
                        .schemaType('resenaGoogle')
                        .filter(
                          '_type == "resenaGoogle" && farmacia._ref == $id',
                        )
                        .params({ id: farmaciaId })
                        .apiVersion('2024-10-01')
                        .defaultOrdering([
                          { field: 'fechaPublicacion', direction: 'desc' },
                        ]),
                    ),
                ]),
            ),
        ),
      S.documentTypeListItem('resenaGoogle').title('⭐ Reseñas Google (todas)'),
      S.divider(),
      S.listItem()
        .id('hubCalendario')
        .title('🌐 Hub Calendario (sitio standalone)')
        .child(
          S.list()
            .title('Hub Calendario')
            .items([
              S.documentTypeListItem('farmaciaPartner').title(
                '🏷️  Farmacias partner',
              ),
              S.documentTypeListItem('fuenteOficial').title('📚 Fuentes oficiales'),
              S.documentTypeListItem('paginaLegal').title('📄 Páginas legales'),
            ]),
        ),
    ]);
