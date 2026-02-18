import scrapy
import logging
from .items

logger = logging.getLogger(__name__)


class BaseSpider(scrapy.Spider):
    name = "base_spider"
    allowed_domains = []
    start_urls = []

    def parse(self, response):
        logger.info(f"Парсинг: {response.url}")

        # Создаем элемент данных
        item = ScraperItem()
        item['title'] = response.css('title::text').get()
        item['url'] = response.url

        yield item