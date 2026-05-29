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
                    .child(() => {
                      const listaPorRating = (rating: number | null) => {
                        const filtroRating =
                          rating === null ? '' : ` && rating == ${rating}`;
                        const titulo =
                          rating === null
                            ? 'Reseñas de esta farmacia'
                            : `Reseñas de ${rating} ${rating === 1 ? 'estrella' : 'estrellas'}`;
                        return S.documentList()
                          .title(titulo)
                          .schemaType('resenaGoogle')
                          .filter(
                            `_type == "resenaGoogle" && farmacia._ref == $id${filtroRating}`,
                          )
                          .params({ id: farmaciaId })
                          .apiVersion('2024-10-01')
                          .defaultOrdering([
                            { field: 'fechaPublicacion', direction: 'desc' },
                          ]);
                      };
                      return S.list()
                        .title('Reseñas')
                        .items([
                          S.listItem()
                            .id('todas')
                            .title('Todas')
                            .child(listaPorRating(null)),
                          S.divider(),
                          ...[5, 4, 3, 2, 1].map((n) =>
                            S.listItem()
                              .id(`rating-${n}`)
                              .title(`${'★'.repeat(n)}${'☆'.repeat(5 - n)}  ${n} ${n === 1 ? 'estrella' : 'estrellas'}`)
                              .child(listaPorRating(n)),
                          ),
                        ]);
                    }),
                ]),
            ),
        ),
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
