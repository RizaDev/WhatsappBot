const phoneNumberFormatter = function(number){
    //1. Menghilangkan karakter selain angka
    let formatter = number.replace(/\D/g, '');
    //2. Ganti angka 0 dengan 62
    if(formatter.startsWith('0')){
        formatter = '62' + formatter.substr(1);
    }
    //3. tambahkan @c.us diakhir number
    if(!formatter.endsWith('@c.us')){
        formatter += '@c.us';
    }

    return formatter;
}

//eksport module
module.exports = {phoneNumberFormatter}