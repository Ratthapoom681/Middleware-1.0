from elasticsearch import Elasticsearch

from app.db.elasticsearch.client import es_client


def get_es() -> Elasticsearch:
    return es_client
