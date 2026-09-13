#!/usr/bin/env python3
"""Check the static export without installing dependencies or contacting a server."""

import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://www.textile-solution-bd.com/"
LOCAL_HOSTS = {urlsplit(ORIGIN).netloc, "textile-solution-bd.com"}
VOID = set("area base br col embed hr img input link meta param source track wbr".split())
CSS_URL = re.compile(r"url\(\s*(?:\"([^\"]*)\"|'([^']*)'|([^)]*))\s*\)", re.I)


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.ids = []
        self.refs = []
        self.errors = []
        self.stack = []
        self.json_blocks = []
        self.active_json = None
        self.is_post = False
        self.bookmarks = set()
        self.feed(path.read_text(encoding="utf-8"))
        self.close()
        if self.stack:
            self.fail(f"Unclosed tags: {self.stack}")
        for ident, count in Counter(self.ids).items():
            if not ident or count > 1:
                self.fail(f"Empty or duplicate ID: {ident!r} ({count} occurrences)")
        for line, source in self.json_blocks:
            self.check_json(source, f"script on line {line}")

    def fail(self, message):
        self.errors.append(f"{self.path.relative_to(ROOT)}:{self.getpos()[0]}: {message}")

    def check_json(self, value, label):
        try:
            json.loads(value)
        except json.JSONDecodeError as error:
            self.fail(f"Invalid JSON in {label}: {error}")

    def collect_css_urls(self, source):
        for match in CSS_URL.finditer(source):
            reference = next(value for value in match.groups() if value is not None).strip()
            if reference:
                self.refs.append((reference, self.getpos()[0]))

    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        if len(attrs_dict) != len(attrs):
            self.fail(f"Duplicate attributes on <{tag}>")
        if "id" in attrs_dict:
            self.ids.append(attrs_dict["id"])
        if tag == "body":
            self.is_post = "single-post" in attrs_dict.get("class", "").split()
        if tag == "a" and "bookmark" in attrs_dict.get("rel", "").split():
            self.bookmarks.add(attrs_dict.get("href"))
        for attr in ("src", "href", "xlink:href", "poster", "action"):
            if attrs_dict.get(attr):
                self.refs.append((attrs_dict[attr], self.getpos()[0]))
        if tag == "object" and attrs_dict.get("data"):
            self.refs.append((attrs_dict["data"], self.getpos()[0]))
        for attr in ("style", "fill", "stroke", "filter", "clip-path", "mask",
                     "marker-start", "marker-mid", "marker-end"):
            if attrs_dict.get(attr):
                self.collect_css_urls(attrs_dict[attr])
        for candidate in attrs_dict.get("srcset", "").split(","):
            if candidate.strip():
                self.refs.append((candidate.strip().split()[0], self.getpos()[0]))
        for attr in ("data-settings", "data-config"):
            if attrs_dict.get(attr):
                self.check_json(attrs_dict[attr], attr)
        if tag in ("a", "button", "form") and tag in self.stack:
            self.fail(f"Nested <{tag}> elements")
        if tag == "a" and "button" in self.stack:
            self.fail("Link nested inside a button")
        if tag == "script" and attrs_dict.get("type") in (
            "application/ld+json", "importmap", "speculationrules"
        ):
            self.active_json = [self.getpos()[0], ""]
            self.json_blocks.append(self.active_json)
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == "script":
            self.active_json = None
        if tag in VOID:
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.fail(f"Unexpected closing </{tag}> (open tags: {self.stack[-4:]})")
            if tag in self.stack:
                self.stack = self.stack[:len(self.stack) - 1 - self.stack[::-1].index(tag)]

    def handle_data(self, data):
        if self.active_json is not None:
            self.active_json[1] += data
        elif self.stack and self.stack[-1] == "style":
            self.collect_css_urls(data)


def resolve_url(reference, source):
    url = urlsplit(urljoin(ORIGIN + source.relative_to(ROOT).as_posix(), reference))
    if url.scheme not in ("http", "https") or url.netloc not in LOCAL_HOSTS:
        return None, url
    path = ROOT / unquote(url.path).lstrip("/")
    return (path / "index.html" if path.is_dir() else path), url


def main():
    paths = [ROOT / "index.html", *sorted(ROOT.glob("*/index.html"))]
    pages = {path: Page(path) for path in paths}
    errors = [error for page in pages.values() for error in page.errors]
    references = 0
    for path, page in pages.items():
        for ref, line in page.refs:
            destination, url = resolve_url(ref, path)
            if destination is None:
                continue
            references += 1
            label = f"{path.relative_to(ROOT)}:{line}"
            if not destination.is_file():
                errors.append(f"{label}: Missing local target: {ref}")
            elif (destination in pages and url.fragment
                  and not url.fragment.startswith(":~:")
                  and unquote(url.fragment) not in pages[destination].ids):
                errors.append(f"{label}: Missing fragment: {ref}")

    search_path = ROOT / "assets/search-index.json"
    try:
        index = json.loads(search_path.read_text(encoding="utf-8"))
        destinations = []
        for entry in index:
            if not all(isinstance(entry.get(key), str) and entry[key].strip()
                       for key in ("url", "title", "text")):
                errors.append("search-index.json: An entry has missing or empty fields")
                continue
            destination, _ = resolve_url(entry["url"], ROOT / "index.html")
            destinations.append(destination)
        if len(destinations) != len(set(destinations)) or set(destinations) != set(pages):
            errors.append("search-index.json: Must include each local page exactly once")
    except (json.JSONDecodeError, TypeError, AttributeError) as error:
        errors.append(f"search-index.json: {error}")

    blog = pages[ROOT / "blog/index.html"]
    posts = {"/" + path.parent.name + "/" for path, page in pages.items() if page.is_post}
    if blog.bookmarks != posts:
        errors.append(f"Blog archive differs from available articles: {blog.bookmarks ^ posts}")
    if errors:
        print("\n".join(errors), file=sys.stderr)
        return 1
    print(f"PASS: {len(pages)} pages, {references} local references, unique IDs, valid markup/JSON, "
          f"complete search index, and all {len(posts)} blog articles.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
