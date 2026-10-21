from market_view.houses import normalize_house


def test_variants_map_to_one_house():
    for n in ["골드만삭스", "Goldman Sachs", "GS", "goldman"]:
        assert normalize_house(n) == "Goldman Sachs"
    assert normalize_house("JP모간") == normalize_house("JPMorgan") == "JPMorgan"
    assert normalize_house("톰 리") == normalize_house("Fundstrat") == "Fundstrat"
    assert normalize_house("BlackRock") == "BlackRock"


def test_strategist_maps_to_house():
    assert normalize_house("David Kostin") == "Goldman Sachs"


def test_domestic_or_unknown_is_none():
    assert normalize_house("삼성증권") is None
    assert normalize_house("KB증권") is None
    assert normalize_house("동네 개미") is None
    assert normalize_house("") is None


def test_short_alias_as_word_in_longer_name():
    assert normalize_house("BofA Securities") == "BofA"
    assert normalize_house("BofA Global Research") == "BofA"
    assert normalize_house("Citi Research") == "Citi"
    assert normalize_house("UBS Global Wealth Management") == "UBS"
    assert normalize_house("HSBC Global Research") == "HSBC"
    assert normalize_house("CLSA Korea") == "CLSA"
    assert normalize_house("GS Asset Management") == "Goldman Sachs"


def test_bare_surname_does_not_attribute():
    assert normalize_house("Russell Wilson Capital") is None
    assert normalize_house("Mike Wilson") == "Morgan Stanley"
