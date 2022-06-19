//ymaps.ready(init);

window.addEventListener("load", setListener);

function setListener() {
    document.getElementById("start").addEventListener("click", init);
    document.getElementById("from").addEventListener("input", cityInput);
    document.getElementById("to").addEventListener("input", cityInput);
}


async function getAviaSalesCode(location) {
    try {
        const encodedLocation = encodeURI(location)
        const response = await fetch(`https://suggest.aviasales.ru/v2/places.json?locale=ru_RU&max=7&term=${encodedLocation}&types[]=city&types[]=airport&types[]=country`)
        const data = await response.json()
        
        if (!data || !Array.isArray(data) || data.length == 0) {
            return null
        }

        const filtered = data.filter(x => x?.type == 'city' && x?.name.toLowerCase() == location.toLowerCase())

        if (filtered.length == 0) {
            return null
        }

        const code = filtered[0]?.code

        return code
    }    
    catch (e) {
        console.log(`Plane: ${e}`)
        return null
    }
    //https://suggest.aviasales.ru/v2/places.json?locale=ru_RU&max=7&term=%D0%BF%D0%B8%D1%82%D0%B5%D1%80&types[]=city&types[]=airport&types[]=country
}


async function calculatePlane() {
    const from = document.querySelector("#from")?.value
    const to = document.querySelector("#to")?.value
    
    const [ fromCode, toCode ] = [ await getAviaSalesCode(from), await getAviaSalesCode(to) ]

    if (!fromCode || !toCode) {
        return document.getElementById("t2").innerHTML = "К сожалению, произошла ошибки при подсчете стоимости перелёта :(";
    }

    const today = new Date()
    const departMonth = today.getMonth() + 1 < 10 ? `0${today.getMonth() + 1}` : today.getMonth() + 1
    const departDay = today.getDate() + 1 < 10 ? `0${today.getDate() + 1}` : today.getDate() + 1
    const departDate = `${today.getFullYear()}-${departMonth}-${departDay}`
    
    try {
        const response = await fetch(`https://lyssa.aviasales.ru/price_matrix?origin_iata=${fromCode}&destination_iata=${toCode}&depart_start=${departDate}&depart_range=1&affiliate=false`)
        const data = await response.json()

        if (!data || !Array.isArray(data?.prices) || data?.prices.length == 0) {
            return document.getElementById("t2").innerHTML = "К сожалению, произошла ошибки при подсчете стоимости перелёта :(";
        }

        let lowestPrice = data.prices[0]

        for (const offer of data.prices) {
            if (offer.value < lowestPrice.value) {
                lowestPrice = offer
            }
        }
        let text = `Вылет ${departDate}<br>Cтоимость: ${lowestPrice.value}р. <br>Пересадки: ${lowestPrice.number_of_changes > 0 ? lowestPrice.number_of_changes : "Нет"}<br>` 

        return document.getElementById("t2").innerHTML = text
    }
    catch (e) {

        console.log(e)
        return document.getElementById("t2").innerHTML = "К сожалению, произошла ошибки при подсчете стоимости перелёта :(";
    }
    


    //https://lyssa.aviasales.ru/price_matrix?origin_iata=MOW&destination_iata=LED&depart_start=2022-06-21&return_start=2022-06-27&depart_range=6&return_range=6&affiliate=false

    //https://lyssa.aviasales.ru/date_picker_prices?depart_months[]=2022-07-01&depart_months[]=2022-06-01&destination_iata=LED&market=ru&one_way=true&origin_iata=MOW

}


async function calculateTrain() {

    const fromOption = document.querySelector("#from")?.value
    const toOption = document.querySelector("#to")?.value

    if (!fromOption || !toOption) {
        return
    }

    const selectedFrom = document.querySelector(`option[value=${fromOption}`)?.id
    const selectedTo = document.querySelector(`option[value=${toOption}`)?.id

    if (!selectedFrom || !selectedTo) {
        return document.getElementById("t1").innerHTML = "К сожалению, произошла ошибки при подсчете стоимости поездки на поезде :(";
    }

    try {
        const response = await fetch(`https://suggest.travelpayouts.com/search?service=tutu_trains&term=${selectedFrom}&term2=${selectedTo}&callback=n`);
        const text = await response.text()
        const formatedText = text.replace("n(", "").replace(");","");
        const data = JSON.parse(formatedText);

        const translations = {
            "lux": "Люкс",
            "coupe": "Купе",
            "plazcard": "Плацкарт",
            "sedentary": "Сидячие",
            "soft": "СВ"
        }
        
        const prices = {

        }

        for (const trips of data.trips) {
            if (trips.categories) {
                for (const category of trips.categories) {

                    if (!category?.type || !category?.price) {
                        continue
                    }

                    if (!prices[category?.type]) {
                        prices[category?.type] = category.price 
                    }

                    if (prices[category?.type] < category?.price) {
                        prices[category?.type] = category.price 
                    }           
                }
            }
        }

        const translatedPrices = { }

        for (const [type, price] of Object.entries(prices)) {
            if (translations[type]) {
                translatedPrices[translations[type]] = [price]
            } 
        }

        if (Object.keys(translatedPrices).length == 0) {
            return document.getElementById("t1").innerHTML = "К сожалению, произошла ошибки при подсчете стоимости поездки на поезде :(";    
        }

        let resultText = ""

        for (const [type, price] of Object.entries(translatedPrices)) {
            resultText += `${type}: ${price}` + "р." + "<br>"
        }

        document.getElementById("t1").innerHTML = resultText;
    }
    catch (e) {
        console.log(e)
        document.getElementById("t1").innerHTML = "К сожалению, произошла ошибки при подсчете стоимости поездки на поезде :(";
    }
}


async function cityInput() {
    const inputValue = this.value

    if (!inputValue) {
        return
    }

    const encodedValue = encodeURI(inputValue)
    const response = await fetch(`https://www.tutu.ru/suggest/railway_simple/?name=${encodedValue}`)

    try {
        const data = await response.json()
        if (!data || !Array.isArray(data) || data.length == 0) {
            return
        }

        const selectElement = document.querySelector(`#${this.id}Suggested`)

        
        while (selectElement.children.length > 0) {
            selectElement.innerHTML = ""
        }

        for (const suggest of data) {
            const element = document.createElement("option")
            element.id = suggest.id
            element.value = suggest.value
            document.querySelector(`#${this.id}Suggested`).appendChild(element)
        }
    }
    catch (e) {
        console.log(`debug: ${e}, ${this.id}Suggested`)
    }
}


function init() {

    if (document.getElementById("map").style.display == "block") {
        return
    }

    calculateTrain()
    calculatePlane()

    document.getElementById("map").style.display = "block"
    document.getElementById("car").style.display = "inline-block"
    document.getElementById("train").style.display = "inline-block"
    document.getElementById("plane").style.display = "inline-block"
    document.getElementById("mapcom").style.display = "inline-block"
    // Стоимость за километр.
    
    var pointA = document.getElementById('from').value;
    var pointB =document.getElementById('to').value;
    var consum = document.getElementById('fuel').value;
    var fuelprice = document.getElementById('fuelpr').value;

    var DELIVERY_TARIFF = consum / 100 * fuelprice ,
    // Минимальная стоимость.
        MINIMUM_COST = 0,
        myMap = new ymaps.Map('map', {
            center: [55.75463429, 37.62000851],
            zoom: 9,
            controls: []
        }),
    // Создадим панель маршрутизации.
        routePanelControl = new ymaps.control.RoutePanel({
            options: {
                // Добавим заголовок панели.
                showHeader: true,
                title: 'Расчёт поездки'
            }
        }),
        zoomControl = new ymaps.control.ZoomControl({
            options: {
                size: 'small',
                float: 'none',
                position: {
                    bottom: 145,
                    right: 10
                }
            }
        });
    // Пользователь сможет построить только автомобильный маршрут.
    routePanelControl.routePanel.options.set({
        types: {auto: true}
    });

    // Если вы хотите задать неизменяемую точку "откуда", раскомментируйте код ниже.
    routePanelControl.routePanel.state.set({
        //fromEnabled: false,
        from: pointA,
        to: pointB
     });

    myMap.controls.add(routePanelControl).add(zoomControl);

    // Получим ссылку на маршрут.
    routePanelControl.routePanel.getRouteAsync().then(function (route) {

        // Зададим максимально допустимое число маршрутов, возвращаемых мультимаршрутизатором.
        route.model.setParams({results: 1}, true);

        // Повесим обработчик на событие построения маршрута.
        route.model.events.add('requestsuccess', function () {

            var activeRoute = route.getActiveRoute();
            if (activeRoute) {
                // Получим протяженность маршрута.
                var length = route.getActiveRoute().properties.get("distance"),
                // Вычислим стоимость доставки.
                    price = calculate(Math.round(length.value / 1000)),
                // Создадим макет содержимого балуна маршрута.
                    balloonContentLayout = ymaps.templateLayoutFactory.createClass(
                        '<span>Расстояние: ' + length.text + '.</span><br/>' +
                        '<span style="font-weight: bold; font-style: italic">Стоимость поездки: ' + price + ' р.</span>');
                    document.getElementById("length").innerText = length.text;
                    document.getElementById("price").innerText = price + 'p.';
                // Зададим этот макет для содержимого балуна.
                //route.options.set('routeBalloonContentLayout', balloonContentLayout);
                // Откроем балун.
                //activeRoute.balloon.open();
            }
        });

    });
    // Функция, вычисляющая стоимость доставки.
    function calculate(routeLength) {
        return Math.max(routeLength * DELIVERY_TARIFF);
    }
}
