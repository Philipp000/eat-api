import m from "../external/mithril.module.js";
import {modal as Labels, subline} from "./labels.js";
import {dateFromString, getWeek, padNumber} from "../modules/date-utils.js";

function getPrice(prices, type) {
    if (Object.prototype.hasOwnProperty.call(prices, type)) {
        const price = prices[type];
        if (price != null) {
            let priceStr = null;

            // Base price:
            const basePrice = parseFloat(price.base_price);
            if (!isNaN(basePrice) && basePrice > 0.0) {
                priceStr = basePrice.toFixed(2) + "€";
            }

            // Unit per price:
            const pricePerUnit = parseFloat(price.price_per_unit);
            if (!isNaN(pricePerUnit) && pricePerUnit > 0.0 && price.unit != null) {
                if (priceStr) {
                    priceStr += " + ";
                } else {
                    priceStr = "";
                }
                priceStr += pricePerUnit.toFixed(2) + "€/" + price.unit;
            }
            return priceStr;
        }
    }
    return "";
}

function Dishes() {
    return {
        view: function (vnode) {
            return [vnode.attrs.dishes.map(function (dish) {
                return m("tr", [
                    m("td", [
                        m("p", dish.name),
                        m(Labels, {selectedLabels: dish.labels},
                            m("span", {class: "is-size-7"}, subline(dish.labels))
                        )
                    ]),
                    m("td", getPrice(dish.prices, "students"))
                ]);
            })];
        }
    };
}

export default function Menu() {
    const MenuData = {
        currentParams: {},
        menu: null,
        error: "",
        fetch: function () {
            const currentDate = dateFromString(m.route.param("date"));
            const {week, year} = getWeek(currentDate);
            const params = {
                mensa: m.route.param("mensa"),
                year,
                week: padNumber(week)
            };

            // if parameters have not changed, no new request is required
            if (MenuData.currentParams.mensa === params.mensa && MenuData.currentParams.year === params.year && MenuData.currentParams.week === params.week) {
                return;
            }
            MenuData.currentParams = params;

            m.request({
                method: "GET",
                url: ":mensa/:year/:week.json",
                params: params
            })
                .then(function (menu) {
                    MenuData.error = "";
                    MenuData.menu = menu;
                })
                .catch(function () {
                    MenuData.error = `No menu found for calendar week ${getWeek(currentDate).week} for canteen ${m.route.param("mensa")} . ¯\\_(ツ)_/¯`;
                });
        }
    };

    return {
        oninit: MenuData.fetch,
        onupdate: MenuData.fetch,
        view: function () {
            function selectedDay(day) {
                return dateFromString(m.route.param("date")).valueOf() === dateFromString(day.date).valueOf();
            }

            if (MenuData.error) {
                return m("div", MenuData.error);
            } else if (!MenuData.menu) {
                return m("div", "Loading...");
            }

            const menuOfTheDay = MenuData.menu.days.find(selectedDay);
            if (!menuOfTheDay) {
                return m("div", `There is no menu for ${dateFromString(m.route.param("date"))}`);
            } else {
                return m("div",
                    m("table", {class: "table is-hoverable is-fullwidth"}, [
                        m("thead", m("tr", [
                            m("th", m("span", [
                                "Dish",
                                m(Labels, m("span", {class: "icon icon-small"}, m("i", {class: "fa fa-info-circle"})))
                            ])),
                            m("th", "Price (students)")
                        ])),
                        m("tbody", [
                            m(Dishes, {dishes: menuOfTheDay.dishes})
                        ]),
                        m("tfoot", m("tr", [m("td", {class: "p-0"}), m("td", {class: "p-0"})]))
                    ])
                );
            }
        }
    };
}
