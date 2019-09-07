const getKeyword = ({
  knex,
  keywordId
}) => { 
  console.log('getKeyword')
  return  knex.raw(`
  select
    report.keyword_id as id,
    report.keyword_text as term,
    active.bid as bid
  from keyword_report report
  join active_keyword active on report.keyword_id = active.keyword_id  
    where report.keyword_id = '${keywordId}'
  order by active.date desc
  limit 1;
`).then(res => res.rows[0]);
}

const getKeywordLatestBid = ({ knex, keywordId }) => { 
  console.log('getKeywordLatestBid for', keywordId);
  console.log( knex.raw(`
  select
    bid as bid
  from active_keyword
    where keyword_id = '${keywordId}'
  order by date desc
  limit 1;
`).toString())
  return knex.raw(`
  select
    bid as bid
  from active_keyword
    where keyword_id = '${keywordId}'
  order by date desc
  limit 1;
`).then(res => res.rows[0].bid);
}

const getKeywordTerm = ({ knex, keywordId }) => { 
  console.log('getKeywordTerm');
  return knex.raw(`
  select
    keyword_text as term
  from active_keyword
    where keyword_id = '${keywordId}'
  limit 1;
`).then(res => res.rows[0].term);;
}

export default {
  Query: {
    Keyword: (parent, { id: keywordId }, { handler }) => getKeyword({
      knex: handler.knex,
      keywordId,
    })
  },
  Keyword: {
    term: ({ id: keywordId }, args, { handler }) => getKeywordTerm({
      knex: handler.knex,
      keywordId,
    }),
    //  current bid
    bid: ({ id: keywordId }, args, { handler }) => getKeywordLatestBid({
      knex: handler.knex,
      keywordId,
    })
  }
}